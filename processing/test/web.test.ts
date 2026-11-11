import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  AreaRegistry,
  InputError,
  catalog,
  catalogWetlands,
  parseRequest,
  validateDrawnArea,
} from "../src/catalog.js";
import { resolvePeriod, monthlyWindows } from "../src/period.js";
import {
  analyze,
  type AnalysisRunner,
  type AnalysisResult,
} from "../src/analysis.js";
import { createAnalysisServer } from "../src/server.js";
import { JobStore, type Job } from "../src/jobs.js";
import { hashRecord } from "@vega/shared";
import type { StacItem } from "../src/stac.js";

const now = () => new Date("2026-11-11T12:00:00.000Z");
const terminal = (job: Job) => !["queued", "running"].includes(job.status);
async function waitFor<T>(
  get: () => Promise<T>,
  ready: (v: T) => boolean,
): Promise<T> {
  for (let i = 0; i < 200; i++) {
    const value = await get();
    if (ready(value)) return value;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("La prueba no terminó a tiempo");
}
function emptyResult(request: Parameters<AnalysisRunner>[0]): AnalysisResult {
  return {
    period: request.period,
    measurements: [],
    frames: [],
    issues: [],
    provenance: [],
    publication: { status: "not_requested", reviewRequired: true },
    areas: request.areas,
  };
}

test("tres años móviles, año bisiesto y 36 ventanas sin deriva ni solapamiento", () => {
  const period = resolvePeriod(undefined, undefined, now());
  assert.equal(period.from, "2023-11-11T12:00:00.000Z");
  const windows = monthlyWindows(period);
  assert.equal(windows.length, 36);
  assert.equal(windows[0].from, period.from);
  assert.equal(windows.at(-1)!.to, period.to);
  windows.slice(1).forEach((w, i) => assert.equal(w.from, windows[i].to));
  assert.equal(
    resolvePeriod(undefined, undefined, new Date("2024-02-29T01:00:00Z")).from,
    "2021-02-28T01:00:00.000Z",
  );
  const ends = monthlyWindows(
    resolvePeriod(undefined, "2026-03-31T00:00:00Z", now()),
  );
  assert.equal(ends.at(-1)!.from, "2026-02-28T00:00:00.000Z");
  assert.equal(ends.at(-2)!.from, "2026-01-31T00:00:00.000Z");
  assert.throws(
    () => resolvePeriod("2024-02-30", "2024-04-01", now()),
    /válidas/,
  );
  assert.throws(
    () => resolvePeriod("2020-01-01", "2026-01-01", now()),
    /tres años/,
  );
  assert.throws(() => resolvePeriod(undefined, "2027-01-01", now()), /futura/);
});

test("catálogo compartido, dibujo validado e identidad persistente", () => {
  const directory = mkdtempSync(join(tmpdir(), "vega-registry-"));
  try {
    assert.equal(
      catalog("salta").salars[0].id,
      catalog("catamarca").salars[0].id,
    );
    assert.equal(catalog("jujuy").coverage.complete, true);
    assert.ok(catalog("jujuy").salars.length > 0);
    const grande = catalog("salta").salars.find(
      (s) => s.name === "Salinas Grandes" && s.provinces.includes("jujuy"),
    )!;
    assert.ok(grande);
    assert.equal(
      catalog("jujuy").salars.filter((s) => s.id === grande.id).length,
      1,
    );
    const feature = catalogWetlands()[0];
    const input = { salarId: "hombre-muerto", areas: [feature] };
    const a = parseRequest(input, new AreaRegistry(directory), now());
    const b = parseRequest(input, new AreaRegistry(directory), now());
    assert.equal(
      a.areas[0].feature.properties.wetlandId,
      b.areas[0].feature.properties.wetlandId,
    );
    assert.equal(a.areas[0].identityStatus, "provisional");
    assert.ok(a.areas[0].feature.properties.wetlandId >= 1_000_000_000);
    const reversed = {
      ...feature,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          (feature.geometry.coordinates[0] as number[][]).slice().reverse(),
        ],
      },
    };
    const equivalent = parseRequest(
      { ...input, areas: [reversed] },
      new AreaRegistry(directory),
      now(),
    );
    assert.equal(
      equivalent.areas[0].feature.properties.wetlandId,
      a.areas[0].feature.properties.wetlandId,
    );
    const outside = {
      ...feature,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-80, -25],
            [-79, -25],
            [-79, -24],
            [-80, -25],
          ],
        ],
      },
    };
    assert.throws(() => validateDrawnArea(outside), InputError);
    const crossed = {
      ...feature,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-67.1, -25.4],
            [-67.09, -25.39],
            [-67.09, -25.4],
            [-67.1, -25.39],
            [-67.1, -25.4],
          ],
        ],
      },
    };
    assert.throws(() => validateDrawnArea(crossed), /cruza/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("contrato GeoJSON del frontend: alias de catálogo y áreas regionales de salar aportado", async () => {
  const directory = mkdtempSync(join(tmpdir(), "vega-import-"));
  try {
    const feature = catalogWetlands()[0],
      registry = new AreaRegistry(directory);
    const request = {
      salarId: "salar-del-hombre-muerto",
      salarName: "Salar del Hombre Muerto",
      geojson: { type: "FeatureCollection", features: [feature] },
      from: "2024-04-01",
      to: "2024-05-01",
    };
    const resolved = parseRequest(request, registry, now());
    assert.equal(resolved.salarId, "hombre-muerto");
    const custom = parseRequest(
      {
        ...request,
        salarId: "salar-personalizado",
        salarName: "Salar personalizado",
      },
      registry,
      now(),
    );
    assert.equal(custom.salar?.boundaryKind, "user_selection");
    assert.ok(custom.salar?.provinces.includes("catamarca"));
    assert.throws(
      () => parseRequest({ ...request, areas: [feature] }, registry, now()),
      /no ambos/,
    );
    assert.throws(
      () => parseRequest({ ...request, geojson: null }, registry, now()),
      /FeatureCollection/,
    );
    const scene: StacItem = JSON.parse(
      readFileSync(
        new URL("../../sample-data/stac/reference-scene.json", import.meta.url),
        "utf8",
      ),
    );
    let progress = { phase: "", completed: 0, total: 0 };
    const png = PNG.sync.write(new PNG({ width: 1, height: 1 }));
    const result = await analyze(
      custom,
      {
        id: "custom",
        directory,
        progress: (p) => {
          progress = p;
        },
      },
      {
        search: async () => [scene],
        compute: async () => ({ ndwi: 0.5, totalPixels: 10, validPixels: 10 }),
        render: async () => ({ png, bbox: [-67.1, -25.5, -67, -25.4] }),
      },
    );
    assert.equal(result.measurements.length, 1);
    assert.equal(result.salarFrames?.length, 0);
    assert.ok(result.issues.some((i) => i.code === "salar_boundary_missing"));
    assert.equal(progress.completed, progress.total);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("motor parametrizado: medida canónica, PNG vinculado y errores técnicos explícitos", async () => {
  const directory = mkdtempSync(join(tmpdir(), "vega-engine-"));
  try {
    const request = parseRequest(
      {
        salarId: "hombre-muerto",
        wetlandIds: [1],
        from: "2024-04-01",
        to: "2024-05-01",
      },
      new AreaRegistry(directory),
      now(),
    );
    const scene: StacItem = JSON.parse(
      readFileSync(
        new URL("../../sample-data/stac/reference-scene.json", import.meta.url),
        "utf8",
      ),
    );
    const png = PNG.sync.write(new PNG({ width: 1, height: 1 }));
    const result = await analyze(
      request,
      { id: "test", directory, progress: () => {} },
      {
        search: async () => [scene],
        compute: async () => ({
          ndwi: 0.25,
          validPixels: 75,
          totalPixels: 100,
        }),
        render: async () => ({ png, bbox: [-67.1, -25.5, -67, -25.4] }),
      },
    );
    assert.equal(result.measurements.length, 1);
    assert.equal(
      hashRecord(result.measurements[0]),
      result.measurements[0].dataHash,
    );
    assert.equal(
      result.frames[0].measurementHashes[0],
      result.measurements[0].dataHash,
    );
    assert.equal(
      Date.parse(result.frames[0].capturedAt),
      Date.parse(scene.properties.datetime),
    );
    assert.equal(result.frames[0].scope, "area");
    assert.equal(result.publication.status, "not_requested");
    assert.equal(
      PNG.sync.read(readFileSync(join(directory, "1-0.png"))).width,
      1,
    );
    const bound = await analyze(
      request,
      { id: "bound", directory, progress: () => {} },
      {
        search: async () => [scene],
        compute: async () => ({
          ndwi: 0.25,
          validPixels: 75,
          totalPixels: 100,
        }),
        render: async () => ({ png, bbox: [-67.1, -25.5, -67, -25.4] }),
        computeGroup: async () => ({
          ndwi: 0.25,
          validPixels: 75,
          totalPixels: 100,
        }),
      },
    );
    assert.ok(
      bound.measurements[0].method.endsWith(
        `geometry-sha256=${request.areas[0].geometryHash}`,
      ),
    );
    const store = new JobStore(join(directory, "cache"), async () => bound);
    const job = store.create(request);
    await waitFor(async () => store.get(job.id)!, terminal);
    const reused = store.create(request);
    assert.equal(reused.id, job.id);
    assert.equal(reused.cacheHit, true);
    const failure = await analyze(
      request,
      { id: "failed", directory, progress: () => {} },
      {
        search: async () => {
          throw new Error("STAC fuera de servicio");
        },
        compute: async () => {
          throw new Error("No debe ejecutarse");
        },
        render: async () => {
          throw new Error("No debe ejecutarse");
        },
      },
    );
    assert.equal(failure.measurements.length, 0);
    assert.equal(failure.issues[0].code, "search_failed");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("HTTP: validación, dos trabajos aislados, errores y recuperación tras reinicio", async () => {
  const directory = mkdtempSync(join(tmpdir(), "vega-http-"));
  const runner: AnalysisRunner = async (request, ctx) => {
    if (request.areas[0].feature.properties.wetlandId === 2)
      throw new Error("fallo controlado");
    return emptyResult(request);
  };
  const { server, jobs } = createAnalysisServer({ directory, runner, now });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const post = (value: unknown) =>
    fetch(`${base}/api/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  try {
    const bad = await post({ salarId: "desconocido", wetlandIds: [1] });
    assert.equal(bad.status, 400);
    const a = await post({ salarId: "hombre-muerto", wetlandIds: [1] });
    assert.equal(a.status, 202);
    const first = (await a.json()) as {
      analysisId: string;
      period: { from: string };
    };
    assert.equal(first.period.from, "2023-11-11T12:00:00.000Z");
    const b = await post({ salarId: "hombre-muerto", wetlandIds: [2] });
    const second = (await b.json()) as { analysisId: string };
    assert.notEqual(first.analysisId, second.analysisId);
    const state = await waitFor(
      async () =>
        (await (
          await fetch(`${base}/api/analyses/${first.analysisId}`)
        ).json()) as Job,
      terminal,
    );
    assert.equal(state.status, "no_data");
    assert.equal(state.publicationStatus, "not_requested");
    const failed = await waitFor(
      async () => jobs.get(second.analysisId)!,
      terminal,
    );
    assert.equal(failed.status, "failed");
    const data = (await (
      await fetch(`${base}/api/analyses/${first.analysisId}/result`)
    ).json()) as AnalysisResult;
    assert.equal(data.areas[0].feature.properties.wetlandId, 1);
    assert.equal(
      (await fetch(`${base}/api/analyses/${second.analysisId}/result`)).status,
      409,
    );
    assert.equal(
      (
        await fetch(
          `${base}/api/analyses/${first.analysisId}/assets/secret.png`,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/health`, {
          headers: { Origin: "https://otro.example" },
        })
      ).status,
      403,
    );
    assert.throws(
      () => createAnalysisServer({ directory, runner, now }),
      /Ya existe/,
    );
    const recovered = new JobStore(join(directory, "jobs"), runner);
    assert.equal(recovered.get(first.analysisId)?.status, "no_data");
    const file = join(jobs.path(second.analysisId), "state.json"),
      interrupted = { ...failed, status: "running" };
    writeFileSync(file, JSON.stringify(interrupted));
    const restarted = new JobStore(join(directory, "jobs"), runner);
    assert.match(restarted.get(second.analysisId)!.error!, /reinició/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
