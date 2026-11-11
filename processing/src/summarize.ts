/** Resumen reproducible para I3, el pitch y la revisión de la serie. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { hashRecord, type HashedMeasurement } from "@vega/shared";
import { loadWetlands } from "./wetlands.js";
import { readSceneCache } from "./cache.js";
import { coversWetland, polygonPixelCount } from "./ndwi.js";
const root = new URL("../../sample-data/", import.meta.url);
const records: HashedMeasurement[] = JSON.parse(readFileSync(new URL("measurements.json",root),"utf8"));
const report = JSON.parse(readFileSync(new URL("measurements.report.json",root),"utf8"));
const hashes = new Set<string>();
const months = new Set<string>();
const wetlands = loadWetlands();
const scenes = new Map(wetlands.map((w) => [w.properties.wetlandId,readSceneCache(w.properties.wetlandId)]));
for (const r of records) {
  assert.equal(hashRecord(r),r.dataHash);
  assert.ok(Number.isInteger(r.ndwi) && Math.abs(r.ndwi)<=10000);
  assert.ok(Number.isSafeInteger(r.timestamp) && r.timestamp>0);
  assert.ok(Number.isInteger(r.validPixels) && r.validPixels>0);
  const month = new Date(r.timestamp*1000).toISOString().slice(0,7);
  const key=`${r.wetlandId}:${month}`;
  assert.ok(!months.has(key),`Mes duplicado: ${key}`);
  assert.ok(!hashes.has(r.dataHash),`Hash duplicado: ${r.dataHash}`);
  hashes.add(r.dataHash); months.add(key);
  const p=report.provenance.find((p: {dataHash:string}) => p.dataHash===r.dataHash);
  assert.ok(p && p.validFraction>=report.config.minValidFraction && p.validFraction<=1);
  const wetland = wetlands.find((w) => w.properties.wetlandId===r.wetlandId)!;
  const scene = scenes.get(r.wetlandId)!.find((s) => s.id===r.sceneId)!;
  assert.ok(scene && coversWetland(scene,wetland));
  assert.equal(p.polygonSha256,createHash("sha256").update(JSON.stringify(wetland.geometry)).digest("hex"));
  assert.equal(p.totalPixels,polygonPixelCount(scene,wetland));
  assert.equal(p.validFraction,r.validPixels/p.totalPixels);
}
assert.equal(records.length,report.count);
const summary=wetlands.map((w) => {
  const rows=records.filter((r) => r.wetlandId===w.properties.wetlandId);
  const values=rows.map((r) => r.ndwi/10000);
  const fractions=rows.map((r) => report.provenance.find((p: {dataHash:string}) => p.dataHash===r.dataHash).validFraction as number);
  return { wetlandId:w.properties.wetlandId,name:w.properties.name,count:rows.length,from:new Date(rows[0].timestamp*1000).toISOString().slice(0,10),to:new Date(rows.at(-1)!.timestamp*1000).toISOString().slice(0,10),
    minNdwi:Math.min(...values),maxNdwi:Math.max(...values),minValidFraction:Math.min(...fractions),
    provisionalThreshold:w.properties.thresholdNdwi/10000,belowProvisionalThreshold:rows.filter((r) => r.ndwi<w.properties.thresholdNdwi).length };
});
writeFileSync(new URL("measurements.summary.json",root),JSON.stringify({ count:records.length,byWetland:summary,missing:report.failures,warning:"AOI piloto y umbrales provisionales; NDWI no demuestra causalidad minera" },null,2)+"\n");
const csv=["wetlandId,date,ndwi,ndwiScaled,validPixels,validFraction,cloudCover,sceneId,dataHash",...records.map((r) => {
  const p=report.provenance.find((p: {dataHash:string}) => p.dataHash===r.dataHash);
  return [r.wetlandId,new Date(r.timestamp*1000).toISOString(),r.ndwi/10000,r.ndwi,r.validPixels,p.validFraction,r.cloudCover,r.sceneId,r.dataHash].join(",");
})].join("\n")+"\n";
writeFileSync(new URL("measurements.csv",root),csv);
console.log(JSON.stringify({ count:records.length,byWetland:summary,missing:report.failures },null,2));
