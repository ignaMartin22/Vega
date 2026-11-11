import {
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  writeFileSync,
  closeSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { join } from "node:path";
import {
  AreaRegistry,
  InputError,
  catalog,
  catalogWetlands,
  parseRequest,
  findSalar,
} from "./catalog.js";
import { JobStore, isJobId } from "./jobs.js";
import type { AnalysisRunner } from "./analysis.js";

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  const limit = 4 * 1024 * 1024;
  if (Number(req.headers["content-length"]) > limit) {
    req.resume();
    throw new InputError("La solicitud supera 4 MiB");
  }
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= limit) chunks.push(chunk);
  }
  if (size > limit) throw new InputError("La solicitud supera 4 MiB");
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InputError("JSON inválido");
  }
}
export function createAnalysisServer(options: {
  directory: string;
  runner?: AnalysisRunner;
  concurrency?: number;
  origins?: string[];
  now?: () => Date;
}) {
  mkdirSync(options.directory, { recursive: true });
  const lock = join(options.directory, "service.lock");
  if (existsSync(lock)) {
    const prior = JSON.parse(readFileSync(lock, "utf8")) as { pid: number };
    let alive = true;
    try {
      process.kill(prior.pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") alive = false;
      else throw error;
    }
    if (alive)
      throw new Error("Ya existe un servicio usando este directorio de datos");
    unlinkSync(lock);
  }
  const descriptor = openSync(lock, "wx");
  writeFileSync(descriptor, JSON.stringify({ pid: process.pid }));
  closeSync(descriptor);
  const jobs = new JobStore(
    join(options.directory, "jobs"),
    options.runner,
    options.concurrency,
  );
  const registry = new AreaRegistry(options.directory);
  const origins = options.origins ?? [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const server = createServer((req, res) => {
    void (async () => {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin))
        return json(res, 403, { error: "Origen no habilitado" });
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/health")
        return json(res, 200, {
          status: "ok",
          catalogComplete: true,
          catalogDefinition: catalog().coverage.definition,
        });
      if (req.method === "GET" && url.pathname === "/api/salars")
        return json(
          res,
          200,
          catalog(url.searchParams.get("province") ?? undefined),
        );
      const salarRoute = url.pathname.match(
        /^\/api\/salars\/([^/]+)(?:\/(wetlands))?$/,
      );
      if (req.method === "GET" && salarRoute) {
        const selected = findSalar(salarRoute[1]);
        if (!selected) return json(res, 404, { error: "Salar no encontrado" });
        return json(
          res,
          200,
          salarRoute[2]
            ? {
                type: "FeatureCollection",
                features: catalogWetlands(selected.id),
              }
            : selected,
        );
      }
      if (req.method === "POST" && url.pathname === "/api/analyses") {
        if (!jobs.canSubmit())
          return json(res, 429, { error: "Cola llena; intentá más tarde" });
        if (
          !req.headers["content-type"]
            ?.toLowerCase()
            .startsWith("application/json")
        )
          return json(res, 415, {
            error: "Usá Content-Type: application/json",
          });
        const request = parseRequest(
          await body(req),
          registry,
          options.now?.(),
        );
        const job = jobs.create(request);
        res.setHeader("Location", `/api/analyses/${job.id}`);
        return json(res, job.cacheHit ? 200 : 202, {
          analysisId: job.id,
          status: job.status,
          statusUrl: `/api/analyses/${job.id}`,
          period: job.request.period,
          cacheHit: job.cacheHit,
          calculatedAt: job.cacheHit ? job.updatedAt : undefined,
        });
      }
      const route = url.pathname.match(
        /^\/api\/analyses\/([^/]+)(?:\/(result|measurements|assets)(?:\/([^/]+))?)?$/,
      );
      if (req.method === "GET" && route) {
        const [, id, resource, asset] = route;
        if (!isJobId(id))
          return json(res, 404, { error: "Análisis no encontrado" });
        const job = jobs.get(id);
        if (!job) return json(res, 404, { error: "Análisis no encontrado" });
        if (!resource) return json(res, 200, job);
        if (resource === "assets") {
          if (!asset || !/^\d+-\d+\.png$/.test(asset))
            return json(res, 404, { error: "Imagen no encontrada" });
          const file = join(jobs.path(id), asset);
          if (!existsSync(file))
            return json(res, 404, { error: "Imagen no encontrada" });
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Cache-Control": "private, max-age=3600",
          });
          createReadStream(file)
            .on("error", () => res.destroy())
            .pipe(res);
          return;
        }
        if (asset) return json(res, 404, { error: "Ruta no encontrada" });
        const result = jobs.result(id);
        if (!result)
          return json(res, 409, {
            error: "El resultado todavía no está disponible",
            status: job.status,
            detail: job.error,
          });
        if (resource === "measurements") {
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${id}-measurements.json"`,
          );
          res.setHeader("X-Vega-Publication-Review", "required");
          return json(res, 200, result.measurements);
        }
        return json(res, 200, result);
      }
      return json(res, 404, { error: "Ruta no encontrada" });
    })().catch((error) =>
      json(res, error instanceof InputError ? 400 : 500, {
        error:
          error instanceof InputError
            ? error.message
            : "Error interno del servicio",
      }),
    );
  });
  server.on("close", () => {
    if (
      existsSync(lock) &&
      JSON.parse(readFileSync(lock, "utf8")).pid === process.pid
    )
      unlinkSync(lock);
  });
  return { server, jobs };
}
