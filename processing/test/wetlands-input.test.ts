import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadWetlands, parseWetlandsGeoJson } from "../src/wetlands.js";

const feature = {
  type: "Feature",
  properties: { wetlandId: 1, name: "Humedal de prueba", salar: "Salar de prueba", thresholdNdwi: 1500 },
  geometry: { type: "Polygon", coordinates: [[[-67.1,-25.4],[-67.0,-25.4],[-67.0,-25.3],[-67.1,-25.4]]] },
};
const collection = (features: unknown[] = [feature]) => JSON.stringify({ type: "FeatureCollection", features });

test("valida FeatureCollection de salar personalizado", () => {
  assert.equal(parseWetlandsGeoJson(collection()).length, 1);
  assert.throws(() => parseWetlandsGeoJson("{"), /JSON válido/);
  assert.throws(() => parseWetlandsGeoJson(collection([])), /entre 1 y 100/);
  assert.throws(() => parseWetlandsGeoJson(collection([feature, feature])), /duplicado/);
  const open = structuredClone(feature);
  open.geometry.coordinates[0][3] = [-67.2,-25.4];
  assert.throws(() => parseWetlandsGeoJson(collection([open])), /no está cerrado/);
  const outside = structuredClone(feature);
  outside.geometry.coordinates[0][1] = [181,-25.4];
  assert.throws(() => parseWetlandsGeoJson(collection([outside])), /fuera de WGS84/);
  const multi = structuredClone(feature);
  multi.geometry.type = "MultiPolygon";
  assert.throws(() => parseWetlandsGeoJson(collection([multi])), /Polygon/);
});

test("loadWetlands acepta una ruta GeoJSON explícita sin modificar el dataset de ejemplo", () => {
  const dir = mkdtempSync(join(tmpdir(), "vega-custom-geojson-"));
  try {
    const path = join(dir, "salar.geojson");
    writeFileSync(path, collection());
    assert.equal(loadWetlands(path)[0].properties.salar, "Salar de prueba");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
