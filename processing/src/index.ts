import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  NDWI_METHOD,
  RECORD_SCHEMA,
  hashRecord,
  toScaled,
  withHash,
  type HashedMeasurement,
} from "@vega/shared";
import { loadWetlands } from "./wetlands.js";
import { searchScenes, type StacItem } from "./stac.js";
import { computeNdwi, coversWetland, polygonPixelCount } from "./ndwi.js";
import { settings } from "./settings.js";
import { readSceneCache, writeSceneCache } from "./cache.js";

const config = settings();
if ((config.limit || config.wetlandId) && !process.env.OUTPUT)
  throw new Error(
    "Con LIMIT/WETLAND_ID indicá OUTPUT=sample-data/measurements.pilot.json",
  );
const root = new URL("../../", import.meta.url);
const dir = new URL("sample-data/stac/", root);
const output = new URL(
  process.env.OUTPUT ?? "sample-data/measurements.json",
  root,
);
const reportPath = new URL(output.href.replace(/\.json$/, ".report.json"));
if (reportPath.href === output.href)
  throw new Error("OUTPUT debe terminar en .json");
mkdirSync(dir, { recursive: true });
interface Provenance {
  dataHash: string;
  sceneId: string;
  polygonSha256: string;
  wetland: unknown;
  epsg: number | undefined;
  boaOffsetApplied: boolean | undefined;
  assets: Record<string, unknown>;
  totalPixels?: number;
  validFraction?: number;
}
const previous: HashedMeasurement[] =
  process.env.RESUME === "1" && existsSync(output)
    ? JSON.parse(readFileSync(output, "utf8"))
    : [];
const oldProvenance: Provenance[] =
  previous.length && existsSync(reportPath)
    ? JSON.parse(readFileSync(reportPath, "utf8")).provenance
    : [];
const out: HashedMeasurement[] = [];
const provenance: Provenance[] = [];
const failures: { wetlandId: number; month: string; error: string }[] = [];
const rejected: { wetlandId: number; sceneId: string; reason: string }[] = [];
const wetlands = loadWetlands().filter(
  (w) =>
    config.wetlandId === undefined ||
    w.properties.wetlandId === config.wetlandId,
);
if (!wetlands.length) throw new Error("No hay humedales para procesar");
for (const w of wetlands) {
  const polygonSha256 = createHash("sha256")
    .update(JSON.stringify(w.geometry))
    .digest("hex");
  const items: StacItem[] = config.offline
    ? readSceneCache(w.properties.wetlandId)
    : await searchScenes(w, config.from, config.to, config.maxCloud);
  if (!config.offline) writeSceneCache(w.properties.wetlandId, items);
  const candidates = items.filter(
    (item) =>
      Date.parse(item.properties.datetime) >= Date.parse(config.from) &&
      Date.parse(item.properties.datetime) <= Date.parse(config.to) &&
      item.properties["eo:cloud_cover"] < config.maxCloud &&
      coversWetland(item, w),
  );
  candidates.sort(
    (a, b) =>
      a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"] ||
      a.properties.datetime.localeCompare(b.properties.datetime) ||
      a.id.localeCompare(b.id),
  );
  const groups = new Map<string, StacItem[]>();
  for (const item of candidates) {
    const month = item.properties.datetime.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), item]);
  }
  let months: string[] = [];
  const first = new Date(config.from),
    last = new Date(config.to);
  const calendar = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1),
  );
  const end = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1);
  for (
    ;
    calendar.getTime() <= end;
    calendar.setUTCMonth(calendar.getUTCMonth() + 1)
  )
    months.push(calendar.toISOString().slice(0, 7));
  if (config.limit) months = months.slice(0, config.limit);
  if (!months.length)
    failures.push({
      wetlandId: w.properties.wetlandId,
      month: "intervalo",
      error: "Sin escenas con cobertura completa",
    });
  console.log(
    `${w.properties.name}: ${items.length} escenas, ${months.length} meses`,
  );
  let cursor = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(config.concurrency, months.length) },
      async () => {
        while (cursor < months.length) {
          const month = months[cursor++];
          let accepted = false;
          for (const item of groups.get(month) ?? []) {
            try {
              const totalPixels = polygonPixelCount(item, w);
              const assets = {
                green: item.assets.green,
                nir: item.assets.nir,
                scl: item.assets.scl,
              };
              const old = previous.find(
                (r) =>
                  r.wetlandId === w.properties.wetlandId &&
                  r.sceneId === item.id,
              );
              const source =
                old &&
                oldProvenance.find(
                  (p) =>
                    p.dataHash === old.dataHash &&
                    p.polygonSha256 === polygonSha256,
                );
              let record: HashedMeasurement;
              if (
                old &&
                source &&
                hashRecord(old) === old.dataHash &&
                JSON.stringify(source.assets) === JSON.stringify(assets) &&
                source.boaOffsetApplied ===
                  item.properties["earthsearch:boa_offset_applied"]
              ) {
                record = old;
              } else {
                let result;
                for (let attempt = 0; attempt < 2; attempt++) {
                  try {
                    result = await computeNdwi(item, w);
                    break;
                  } catch (error) {
                    if (
                      attempt ||
                      !/request|fetch|network|abort|timeout/i.test(
                        String(error),
                      )
                    )
                      throw error;
                  }
                }
                if (!result) throw new Error("No se pudo leer la escena");
                record = withHash({
                  schema: RECORD_SCHEMA,
                  wetlandId: w.properties.wetlandId,
                  ndwi: toScaled(result.ndwi),
                  sceneId: item.id,
                  timestamp: Math.floor(
                    Date.parse(item.properties.datetime) / 1000,
                  ),
                  cloudCover: item.properties["eo:cloud_cover"],
                  validPixels: result.validPixels,
                  method: NDWI_METHOD,
                });
              }
              const validFraction = record.validPixels / totalPixels;
              if (
                !Number.isFinite(validFraction) ||
                validFraction < config.minValidFraction
              )
                throw new Error(
                  `Cobertura válida insuficiente: ${(validFraction * 100).toFixed(1)}%`,
                );
              out.push(record);
              provenance.push({
                dataHash: record.dataHash,
                sceneId: item.id,
                wetland: w,
                polygonSha256,
                epsg: item.properties["proj:epsg"],
                boaOffsetApplied:
                  item.properties["earthsearch:boa_offset_applied"],
                assets,
                totalPixels,
                validFraction,
              });
              console.log(
                `+ AOI ${record.wetlandId} ${item.id}: NDWI=${(record.ndwi / 10000).toFixed(4)}, válidos=${(validFraction * 100).toFixed(1)}%`,
              );
              accepted = true;
              break;
            } catch (error) {
              const reason =
                error instanceof Error ? error.message : String(error);
              rejected.push({
                wetlandId: w.properties.wetlandId,
                sceneId: item.id,
                reason,
              });
              console.error(
                `! AOI ${w.properties.wetlandId} ${item.id}: ${reason}; probando siguiente escena del mes`,
              );
            }
          }
          if (!accepted)
            failures.push({
              wetlandId: w.properties.wetlandId,
              month,
              error: "Ninguna escena del mes superó los controles",
            });
        }
      },
    ),
  );
}
out.sort((a, b) => a.wetlandId - b.wetlandId || a.timestamp - b.timestamp);
provenance.sort((a, b) => a.dataHash.localeCompare(b.dataHash));
const report = { config, count: out.length, failures, rejected, provenance };
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
if (!out.length)
  throw new Error("Ninguna medición válida; se conservó el archivo anterior");
writeFileSync(output, JSON.stringify(out, null, 2) + "\n");
console.log(
  `OK: ${out.length} mediciones -> ${output.pathname}; ${failures.length} meses fallidos; informe ${reportPath.pathname}`,
);
if (failures.length) process.exitCode = 1;
