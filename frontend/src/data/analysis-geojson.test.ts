import assert from "node:assert/strict";
import test from "node:test";
import { parseAnalysisGeoJson } from "./analysis-geojson";

const valid = {
  type: "Feature",
  properties: { name: "Laguna norte" },
  geometry: { type: "Polygon", coordinates: [[
    [-68.1, -25.4], [-68.09, -25.4], [-68.09, -25.39], [-68.1, -25.39], [-68.1, -25.4],
  ]] },
};
const collection = (...features: unknown[]) => JSON.stringify({ type: "FeatureCollection", features });

test("valida y prepara una FeatureCollection para el motor", () => {
  const parsed = parseAnalysisGeoJson(collection(valid), "Salar de prueba");
  assert.equal(parsed.features.length, 1);
  assert.equal(parsed.features[0].properties.name, "Laguna norte");
  assert.equal(parsed.preview[0].properties.salar, "Salar de prueba");
});

test("rechaza JSON inválido, colección vacía y más de cinco áreas", () => {
  assert.throws(() => parseAnalysisGeoJson("{", "Salar"));
  assert.throws(() => parseAnalysisGeoJson(collection(), "Salar"), /entre 1 y 5/);
  assert.throws(() => parseAnalysisGeoJson(collection(valid, valid, valid, valid, valid, valid), "Salar"), /entre 1 y 5/);
});

test("rechaza MultiPolygon, agujeros, coordenadas fuera de WGS84 y anillos abiertos", () => {
  const multi = structuredClone(valid); multi.geometry.type = "MultiPolygon";
  assert.throws(() => parseAnalysisGeoJson(collection(multi), "Salar"), /Polygon/);
  const hole = structuredClone(valid); hole.geometry.coordinates.push(hole.geometry.coordinates[0]);
  assert.throws(() => parseAnalysisGeoJson(collection(hole), "Salar"), /anillo exterior/);
  const outside = structuredClone(valid); outside.geometry.coordinates[0][1][1] = 95;
  assert.throws(() => parseAnalysisGeoJson(collection(outside), "Salar"), /WGS84/);
  const open = structuredClone(valid); open.geometry.coordinates[0].pop();
  assert.throws(() => parseAnalysisGeoJson(collection(open), "Salar"), /cerrado/);
});

test("asigna nombres de vista previa sin inventar mediciones", () => {
  const feature = structuredClone(valid); delete (feature.properties as { name?: string }).name;
  const parsed = parseAnalysisGeoJson(collection(feature), "Salar");
  assert.equal(parsed.features[0].properties.name, "Humedal 1");
  assert.equal(parsed.preview[0].properties.thresholdNdwi, 0);
});
