/** Auditoría de un resultado real persistido; no vuelve a consultar ni modifica mediciones. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { PNG } from "pngjs";
import { hashRecord } from "@vega/shared";
import { geometryHash } from "../src/geometry.js";
import type { AnalysisResult } from "../src/analysis.js";
const [directory, reportFile] = process.argv.slice(2);
if (!directory)
  throw new Error("Uso: verify-output <directorio del trabajo> [informe JSON]");
const input = resolve(directory),
  result: AnalysisResult = JSON.parse(
    readFileSync(join(input, "result.json"), "utf8"),
  );
const state = JSON.parse(readFileSync(join(input, "state.json"), "utf8"));
assert.ok(["succeeded", "partial"].includes(state.status));
for (const record of result.measurements) {
  assert.equal(hashRecord(record), record.dataHash);
  const source = result.provenance.find((p) => p.dataHash === record.dataHash)!;
  assert.ok(source);
  const area = result.areas.find(
    (a) => a.feature.properties.wetlandId === record.wetlandId,
  )!;
  assert.equal(source.geometryHash, geometryHash(area.feature.geometry));
  assert.ok(source.validFraction >= 0.5 && source.validFraction <= 1);
  if (record.method.includes("geometry-sha256="))
    assert.ok(record.method.endsWith(source.geometryHash));
}
const groups = new Map<string, number[]>();
for (const frame of [...result.frames, ...(result.salarFrames ?? [])]) {
  const png = PNG.sync.read(readFileSync(join(input, `${frame.frameId}.png`)));
  assert.ok(png.data.some((v, i) => i % 4 === 3 && v > 0));
  assert.ok(
    Date.parse(frame.capturedAt) >= Date.parse(result.period.from) &&
      Date.parse(frame.capturedAt) < Date.parse(result.period.to),
  );
  const key = `${frame.scope}:${frame.wetlandId}`,
    size = [png.width, png.height, ...frame.bbox];
  if (groups.has(key)) assert.deepEqual(groups.get(key), size);
  else groups.set(key, size);
  for (const hash of frame.measurementHashes)
    assert.ok(result.measurements.some((r) => r.dataHash === hash));
}
const report = {
  analysisId: state.id,
  status: state.status,
  from: result.period.from,
  to: result.period.to,
  createdAt: state.createdAt,
  completedAt: state.updatedAt,
  durationSeconds:
    (Date.parse(state.updatedAt) - Date.parse(state.createdAt)) / 1000,
  measurements: result.measurements.length,
  areaFrames: result.frames.length,
  salarFrames: result.salarFrames?.length ?? 0,
  issues: result.issues,
  allHashesValid: true,
  geometryChecked: true,
  imagesChecked: true,
  scope:
    "Datos reales Sentinel-2; prueba de software, no diagnóstico ambiental ni publicación blockchain",
};
if (reportFile) {
  mkdirSync(resolve(reportFile, ".."), { recursive: true });
  writeFileSync(resolve(reportFile), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
