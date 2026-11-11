import assert from "node:assert/strict";
import test from "node:test";
import type { HashedMeasurement } from "@vega/shared";
import { mergeMeasurements, mergePublishedMeasurements, type PublishedMeasurement } from "../src/outputs.js";

function measurement(dataHash: string): HashedMeasurement;
function measurement(dataHash: string, txHash: string): PublishedMeasurement;
function measurement(dataHash: string, txHash?: string): HashedMeasurement | PublishedMeasurement {
  const record: HashedMeasurement = {
    schema: "vega.measurement.v1",
    wetlandId: 1,
    ndwi: 1234,
    sceneId: `scene-${dataHash}`,
    timestamp: 1_762_800_000,
    cloudCover: 2,
    validPixels: 12,
    method: "NDWI=(B03-B08)/(B03+B08);mean;SCL-masked;v1",
    dataHash: dataHash as `0x${string}`,
  };
  return txHash ? { ...record, txHash } : record;
}

test("published output preserves prior txs and adds each new hash once", () => {
  const prior = [measurement("0x01", "0xtx-old")];
  const additions = [measurement("0x01", "0xtx-duplicate"), measurement("0x02", "0xtx-new")];

  const merged = mergePublishedMeasurements(prior, additions);

  assert.deepEqual(merged.map(({ dataHash, txHash }) => [dataHash, txHash]), [
    ["0x01", "0xtx-old"],
    ["0x02", "0xtx-new"],
  ]);
});

test("frontend records include prior and current measurements, deduplicated by hash", () => {
  const prior = [measurement("0x01")];
  const current = [measurement("0x01"), measurement("0x02")];

  const merged = mergeMeasurements(prior, current);

  assert.deepEqual(merged.map(({ dataHash }) => dataHash), ["0x01", "0x02"]);
});
