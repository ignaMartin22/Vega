import assert from "node:assert/strict";
import test from "node:test";
import type { HashedMeasurement } from "@vega/shared";
import { selectMeasurements } from "../src/selection.js";

const records = [
  { wetlandId: 1, sceneId: "a" },
  { wetlandId: 2, sceneId: "b" },
  { wetlandId: 1, sceneId: "c" },
  { wetlandId: 2, sceneId: "d" },
] as HashedMeasurement[];

test("filters a wetland before applying the publication limit", () => {
  const selected = selectMeasurements(records, ["--only-wetland", "2", "--limit", "1"]);

  assert.deepEqual(selected.map(({ sceneId }) => sceneId), ["b"]);
});

test("rejects missing, non-positive, and unknown options", () => {
  assert.throws(() => selectMeasurements(records, ["--only-wetland"]), /requiere un valor/);
  assert.throws(() => selectMeasurements(records, ["--limit", "0"]), /entero positivo/);
  assert.throws(() => selectMeasurements(records, ["--surprise"]), /Opción desconocida/);
});
