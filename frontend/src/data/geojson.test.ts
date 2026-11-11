import assert from "node:assert/strict";
import test from "node:test";
import { parseWetlandsGeoJson } from "./geojson";

const validFeature = {
  type: "Feature",
  properties: {
    wetlandId: 1,
    name: "Humedal norte",
    salar: "Salar de prueba",
    thresholdNdwi: 1200,
  },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-67.1, -24.1],
      [-67.0, -24.1],
      [-67.0, -24.0],
      [-67.1, -24.0],
      [-67.1, -24.1],
    ]],
  },
};

function collection(...features: unknown[]) {
  return JSON.stringify({ type: "FeatureCollection", features });
}

test("acepta un FeatureCollection válido y normaliza espacios en propiedades", () => {
  const feature = structuredClone(validFeature);
  feature.properties.name = "  Humedal norte  ";
  const [wetland] = parseWetlandsGeoJson(collection(feature));

  assert.equal(wetland.properties.name, "Humedal norte");
  assert.equal(wetland.properties.salar, "Salar de prueba");
  assert.equal(wetland.properties.wetlandId, 1);
});

test("rechaza JSON inválido y colecciones vacías", () => {
  assert.throws(() => parseWetlandsGeoJson("{"), /JSON válido/);
  assert.throws(() => parseWetlandsGeoJson(collection()), /entre 1 y 100/);
});

test("rechaza IDs duplicados", () => {
  const second = structuredClone(validFeature);
  second.properties.name = "Humedal sur";
  assert.throws(() => parseWetlandsGeoJson(collection(validFeature, second)), /duplicado/);
});

test("rechaza anillos abiertos", () => {
  const feature = structuredClone(validFeature);
  feature.geometry.coordinates[0].pop();
  assert.throws(() => parseWetlandsGeoJson(collection(feature)), /debe estar cerrado/);
});

test("rechaza anillos sin superficie", () => {
  const feature = structuredClone(validFeature);
  feature.geometry.coordinates = [[
    [-67.1, -24.1],
    [-67.0, -24.1],
    [-66.9, -24.1],
    [-67.1, -24.1],
  ]];
  assert.throws(() => parseWetlandsGeoJson(collection(feature)), /área cero/);
});

test("rechaza coordenadas fuera de WGS84", () => {
  const feature = structuredClone(validFeature);
  feature.geometry.coordinates[0][1][1] = 95;
  assert.throws(() => parseWetlandsGeoJson(collection(feature)), /EPSG:4326/);
});

test("rechaza propiedades requeridas ausentes y geometrías no soportadas", () => {
  const missingName = structuredClone(validFeature);
  delete (missingName.properties as Partial<typeof validFeature.properties>).name;
  assert.throws(() => parseWetlandsGeoJson(collection(missingName)), /properties.name/);

  const multiPolygon = structuredClone(validFeature);
  (multiPolygon.geometry as { type: string; coordinates: number[][][][] }).type = "MultiPolygon";
  assert.throws(() => parseWetlandsGeoJson(collection(multiPolygon)), /Polygon/);
});
