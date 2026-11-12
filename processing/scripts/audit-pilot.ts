/** Read-only publication preflight. Never loads a private key or sends transactions. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { booleanValid, kinks } from "@turf/turf";
import { Contract, JsonRpcProvider, formatEther } from "ethers";
import { hashRecord, FUJI, VEGA_REGISTRY_ABI } from "@vega/shared";
import { readSceneCache } from "../src/cache.js";
import { computeNdwi, coversWetland, polygonPixelCount } from "../src/ndwi.js";
import { loadWetlands } from "../src/wetlands.js";

const root = new URL("../../", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, root));
const json = (name: string) => JSON.parse(read(name).toString("utf8"));
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const records = json("sample-data/measurements.json");
const sourceReport = json("sample-data/measurements.report.json");
const deployment = json("shared/deployments/fuji.json");
const areas = loadWetlands();
const errors: string[] = [];
const check = (condition: unknown, message: string) => { if (!condition) errors.push(message); };
const seen = new Set<string>();
const seenMonth = new Set<string>();
const byArea = [];
check(records.length === 105 && sourceReport.count === records.length, "Expected 105 records and matching report count");
check(sourceReport.provenance.length === records.length, "Provenance count mismatch");
for (const area of areas) {
  const id = area.properties.wetlandId;
  check(booleanValid(area) && kinks(area).features.length === 0, `AOI ${id}: invalid geometry`);
  const scenes = new Map(readSceneCache(id).map(item => [item.id, item]));
  const subset = records.filter((r: any) => r.wetlandId === id);
  check(subset.length > 0, `AOI ${id}: no records`);
  const fractions: number[] = [];
  for (const record of subset) {
    const label = `${id}/${record.sceneId}`;
    check(record.schema === "vega.measurement.v1", `${label}: schema`);
    check(record.method === "NDWI=(B03-B08)/(B03+B08);mean;SCL-masked;v1", `${label}: unexpected method`);
    check(Number.isSafeInteger(id) && id > 0 && id <= 0xffffffff, `${label}: uint32 ID`);
    check(Number.isInteger(record.ndwi) && Math.abs(record.ndwi) <= 10000, `${label}: NDWI range`);
    check(Number.isSafeInteger(record.timestamp) && record.timestamp > 0 && record.timestamp * 1000 < Date.now(), `${label}: timestamp`);
    check(Number.isFinite(record.cloudCover) && record.cloudCover >= 0 && record.cloudCover < 20, `${label}: cloud cover`);
    check(Number.isSafeInteger(record.validPixels) && record.validPixels > 0, `${label}: valid pixels`);
    check(/^0x[0-9a-f]{64}$/.test(record.dataHash) && hashRecord(record) === record.dataHash, `${label}: hash`);
    check(!seen.has(record.dataHash), `${label}: duplicate hash`); seen.add(record.dataHash);
    const month = new Date(record.timestamp * 1000).toISOString().slice(0, 7);
    check(month >= "2023-01" && month <= "2025-12", `${label}: outside pilot period`);
    check(!seenMonth.has(`${id}/${month}`), `${label}: duplicate month`); seenMonth.add(`${id}/${month}`);
    const scene = scenes.get(record.sceneId);
    check(!!scene, `${label}: missing STAC scene`);
    if (!scene) continue;
    check(record.timestamp === Math.floor(Date.parse(scene.properties.datetime) / 1000), `${label}: acquisition timestamp differs from STAC`);
    check(record.cloudCover === scene.properties["eo:cloud_cover"], `${label}: cloud metadata differs from STAC`);
    check(coversWetland(scene, area), `${label}: scene does not cover AOI`);
    const provenance = sourceReport.provenance.filter((p: any) => p.dataHash === record.dataHash);
    check(provenance.length === 1, `${label}: provenance not unique`);
    const p = provenance[0];
    if (!p) continue;
    check(p.sceneId === record.sceneId && p.wetland.properties.wetlandId === id, `${label}: provenance identity`);
    check(p.wetland.geometry.type === area.geometry.type && JSON.stringify(p.wetland.geometry.coordinates) === JSON.stringify(area.geometry.coordinates), `${label}: provenance geometry`);
    // v1 hashes the original geometry serialization, before the loader normalizes key order.
    check(p.polygonSha256 === sha(JSON.stringify(p.wetland.geometry)), `${label}: polygon SHA256`);
    const total = polygonPixelCount(scene, area);
    const fraction = record.validPixels / total;
    check(p.totalPixels === total && p.validFraction === fraction && fraction >= 0.5 && fraction <= 1, `${label}: pixel coverage`);
    fractions.push(fraction);
    for (const band of ["green", "nir", "scl"]) check(JSON.stringify(p.assets[band]) === JSON.stringify(scene.assets[band]), `${label}: ${band} provenance`);
    check(p.boaOffsetApplied === scene.properties["earthsearch:boa_offset_applied"], `${label}: reflectance calibration metadata`);
  }
  const missing = [];
  for (let year = 2023; year <= 2025; year++) for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, "0")}`;
    if (!seenMonth.has(`${id}/${month}`)) missing.push(month);
  }
  const reportedMissing = sourceReport.failures.filter((f: any) => f.wetlandId === id).map((f: any) => f.month).sort();
  check(JSON.stringify(missing) === JSON.stringify(reportedMissing), `AOI ${id}: missing months differ from report`);
  byArea.push({ wetlandId: id, name: area.properties.name, records: subset.length, threshold: area.properties.thresholdNdwi,
    belowThreshold: subset.filter((r: any) => r.ndwi < area.properties.thresholdNdwi).length,
    minNdwi: Math.min(...subset.map((r: any) => r.ndwi)), maxNdwi: Math.max(...subset.map((r: any) => r.ndwi)),
    minValidFraction: Math.min(...fractions), missingMonths: missing });
}
check(seen.size === records.length, "Unknown IDs, duplicates or unprocessed records");
const rasterChecks: { dataHash: string; ndwi: number; validPixels: number; matches: boolean }[] = [];
if (process.argv.includes("--recompute")) {
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < records.length) {
      const record = records[cursor++];
      try {
        const area = areas.find(a => a.properties.wetlandId === record.wetlandId)!;
        const scene = readSceneCache(record.wetlandId).find(s => s.id === record.sceneId)!;
        const value = await computeNdwi(scene, area);
        const ndwi = Math.round(value.ndwi * 10000);
        const matches = ndwi === record.ndwi && value.validPixels === record.validPixels;
        check(matches, `${record.wetlandId}/${record.sceneId}: raster recomputation differs`);
        rasterChecks.push({ dataHash: record.dataHash, ndwi, validPixels: value.validPixels, matches });
        console.log(`Raster ${rasterChecks.length}/${records.length}: AOI ${record.wetlandId} ${record.sceneId} ${matches ? "OK" : "MISMATCH"}`);
      } catch (error) { errors.push(`Raster ${record.wetlandId}/${record.sceneId}: ${String(error)}`); console.log(`Raster failed: ${record.sceneId}: ${String(error)}`); }
    }
  }));
}
let chain: any = { checked: false };
if (process.argv.includes("--chain")) {
  const provider = new JsonRpcProvider(process.env.FUJI_RPC_URL ?? FUJI.rpcUrl);
  try {
    const network = await provider.getNetwork();
    check(network.chainId === 43113n, "RPC is not Fuji");
    check(await provider.getCode(deployment.address) !== "0x", "No contract bytecode");
    const block = await provider.getBlockNumber();
    const publisher = process.env.AUDIT_PUBLISHER ?? deployment.publisher;
    const registry = new Contract(deployment.address, [...VEGA_REGISTRY_ABI, "function hasThreshold(uint32) view returns (bool)"], provider);
    const allowed = await registry.publishers(publisher, { blockTag: block });
    check(allowed, "Audited publisher is not authorized");
    const balance = await provider.getBalance(publisher, block);
    const groups = [];
    let simulated = 0, alreadyRecorded = 0;
    for (const area of areas) {
      const id = area.properties.wetlandId;
      const threshold = Number(await registry.thresholds(id, { blockTag: block }));
      check(await registry.hasThreshold(id, { blockTag: block }), `AOI ${id}: threshold not configured`);
      check(threshold === area.properties.thresholdNdwi, `AOI ${id}: on-chain threshold mismatch`);
      const existing = await registry.getMeasurements(id, { blockTag: block });
      let estimatedGas = 0n;
      for (const r of records.filter((r: any) => r.wetlandId === id)) {
        const args = [r.wetlandId, r.ndwi, r.sceneId, r.dataHash, r.timestamp];
        if (await registry.isRecorded(r.dataHash, { blockTag: block })) {
          alreadyRecorded++;
          check(existing.some((e: any) => Number(e.wetlandId) === id && Number(e.ndwi) === r.ndwi && e.sceneId === r.sceneId && e.dataHash === r.dataHash && Number(e.timestamp) === r.timestamp), `On-chain mismatch: ${r.dataHash}`);
        } else {
          await registry.recordMeasurement.staticCall(...args, { from: publisher, blockTag: block });
          simulated++;
          if (!estimatedGas) estimatedGas = await registry.recordMeasurement.estimateGas(...args, { from: publisher });
        }
      }
      groups.push({ wetlandId: id, threshold, existingRecords: existing.length, sampleGasEstimate: estimatedGas.toString() });
    }
    chain = { checked: true, chainId: Number(network.chainId), block, address: deployment.address, publisher,
      publisherAuthorized: allowed, balanceAvax: formatEther(balance), simulated, alreadyRecorded, groups };
  } catch (error) { errors.push(`RPC preflight: ${String(error)}`); }
  finally { provider.destroy(); }
}
const report = {
  generatedAt: new Date().toISOString(), commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim(),
  files: Object.fromEntries(["sample-data/measurements.json", "sample-data/wetlands.geojson", "sample-data/measurements.report.json", "sample-data/stac/wetland-1.json.gz", "sample-data/stac/wetland-2.json.gz", "sample-data/stac/wetland-3.json.gz"].map(file => [file, sha(read(file))])),
  status: errors.length ? "FAIL" : "PASS", errors, records: records.length, byArea, chain,
  raster: { requested: process.argv.includes("--recompute"), checked: rasterChecks.length, results: rasterChecks.sort((a,b) => a.dataHash.localeCompare(b.dataHash)) },
  limitations: ["Experimental pilot AOIs and integration thresholds; no ecological calibration.", "Raster recomputation uses the project algorithm, not an independent scientific implementation; see raster.checked for completed comparisons.", "STAC comparisons use the versioned source snapshots, not a fresh remote catalog.", "Legacy v1 measurement hashes do not commit geometry; preserve this manifest and the provenance report.", "RPC simulation does not transmit or guarantee future gas prices, balance, permissions or transaction success.", "Publisher defaults to deployment metadata; use AUDIT_PUBLISHER for Gaby's actual public address."]
};
mkdirSync(new URL("sample-data/validation/", root), { recursive: true });
writeFileSync(new URL("sample-data/validation/publication-preflight.json", root), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
