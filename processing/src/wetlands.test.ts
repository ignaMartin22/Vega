import assert from "node:assert/strict";
import test from "node:test";
import { parseWetlandsGeoJson } from "./wetlands.js";

const feature = {
  type: "Feature",
  properties: { wetlandId: 1, name: "Humedal de prueba", salar: "Salar de prueba", thresholdNdwi: 1500 },
  geometry: {
    type: "Polygon",
    coordinates: [[[-67.1, -25.4], [-67.0, -25.4], [-67.0, -25.3], [-67.1, -25.3], [-67.1, -25.4]]],
  },
};

function collection(features: unknown[] = [feature]): string {
  return JSON.stringify({ type: "FeatureCollection", features });
}

test("parsea una FeatureCollection Polygon válida", () => {
  const wetlands = parseWetlandsGeoJson(collection());
  assert.equal(wetlands.length, 1);
  assert.equal(wetlands[0].properties.wetlandId, 1);
});

test("rechaza JSON inválido y colecciones vacías", () => {
  assert.throws(() => parseWetlandsGeoJson("{"), /JSON válido/);
  assert.throws(() => parseWetlandsGeoJson(collection([])), /entre 1 y 100/);
});

test("rechaza IDs duplicados", () => {
  assert.throws(() => parseWetlandsGeoJson(collection([feature, feature])), /duplicado/);
});

test("rechaza anillos abiertos y coordenadas fuera de WGS84", () => {
  const open = structuredClone(feature);
  open.geometry.coordinates[0][4] = [-67.2, -25.4];
  assert.throws(() => parseWetlandsGeoJson(collection([open])), /no está cerrado/);

  const outside = structuredClone(feature);
  outside.geometry.coordinates[0][1] = [181, -25.4];
  assert.throws(() => parseWetlandsGeoJson(collection([outside])), /fuera de WGS84/);
});

test("rechaza geometrías de área nula y tipos no soportados", () => {
  const zeroArea = structuredClone(feature);
  zeroArea.geometry.coordinates = [[[0, 0], [1, 1], [2, 2], [0, 0]]];
  assert.throws(() => parseWetlandsGeoJson(collection([zeroArea])), /área nula/);

  const multi = structuredClone(feature);
  multi.geometry.type = "MultiPolygon";
  assert.throws(() => parseWetlandsGeoJson(collection([multi])), /solo se admiten/);
});

test("rechaza propiedades fuera del contrato", () => {
  const invalid = structuredClone(feature);
  invalid.properties.thresholdNdwi = 10001;
  assert.throws(() => parseWetlandsGeoJson(collection([invalid])), /thresholdNdwi/);
});
