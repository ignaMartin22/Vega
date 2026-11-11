import assert from "node:assert/strict";
import test from "node:test";
import { calibration, inRing } from "../src/ndwi.js";
import { monthlyScenes, searchScenes, type StacItem } from "../src/stac.js";
import { bbox, type WetlandFeature } from "../src/wetlands.js";
const wetland: WetlandFeature = { type: "Feature", properties: { wetlandId: 1, name: "test", salar: "test", thresholdNdwi: 1500 }, geometry: { type: "Polygon", coordinates: [[[-67,-25],[-66,-25],[-66,-24],[-67,-24],[-67,-25]]] } };
const item = (id: string, date: string, cloud: number): StacItem => ({ id, properties: { datetime: date, "eo:cloud_cover": cloud, "proj:epsg": 32719 }, assets: {} });

test("selección mensual es determinista y elige menor nubosidad", () => {
  const a = item("a", "2024-01-02T00:00:00Z", 5), b = item("b", "2024-01-01T00:00:00Z", 10), c = item("c", "2024-02-01T00:00:00Z", 0);
  assert.deepEqual(monthlyScenes([c,b,a,a]).map((s) => s.id), ["a", "c"]);
  assert.deepEqual(monthlyScenes([a,c,b]).map((s) => s.id), ["a", "c"]);
});
test("polígono y bbox respetan longitud, latitud", () => {
  assert.deepEqual(bbox(wetland), [-67,-25,-66,-24]);
  assert.equal(inRing([-66.5,-24.5], wetland.geometry.coordinates[0]), true);
  assert.equal(inRing([-65,-24.5], wetland.geometry.coordinates[0]), false);
});
test("no aplica dos veces el offset de COG armonizado", () => {
  const s = item("s", "2024-01-01T00:00:00Z", 0);
  const asset = { href: "test", "raster:bands": [{ scale: 0.0001, offset: -0.1, nodata: 0 }] };
  s.properties["earthsearch:boa_offset_applied"] = true;
  assert.equal(calibration(s, asset).offset, 0);
  s.properties["earthsearch:boa_offset_applied"] = false;
  assert.equal(calibration(s, asset).offset, -0.1);
  delete s.properties["earthsearch:boa_offset_applied"];
  assert.throws(() => calibration(s, asset), /ambiguo/);
});
test("STAC pagina GET y deduplica sin perder escenas", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const a = item("a", "2024-01-01T00:00:00Z", 1), b = item("b", "2024-02-01T00:00:00Z", 2);
  globalThis.fetch = (async (_url, init) => {
    calls++;
    if (calls === 1) {
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({ features: [a], links: [{ rel: "next", href: "https://example.test/page2" }] }));
    }
    assert.equal(init?.method, "GET");
    assert.equal(init?.body, undefined);
    return new Response(JSON.stringify({ features: [a,b], links: [] }));
  }) as typeof fetch;
  try {
    assert.deepEqual((await searchScenes(wetland, "2024-01-01", "2024-12-31")).map((s) => s.id), ["a", "b"]);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});
