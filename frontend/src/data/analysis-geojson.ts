import type { WetlandFeature } from "./source";

export interface AnalysisGeoJsonFeature {
  type: "Feature";
  properties: { name: string };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export interface ParsedAnalysisGeoJson {
  features: AnalysisGeoJsonFeature[];
  preview: WetlandFeature[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAnalysisGeoJson(raw: string, salarName: string): ParsedAnalysisGeoJson {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("El archivo no contiene JSON válido."); }
  if (!record(parsed) || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("Se esperaba una GeoJSON FeatureCollection.");
  }
  if (parsed.features.length < 1 || parsed.features.length > 5) {
    throw new Error("El servicio admite entre 1 y 5 polígonos por análisis.");
  }

  const features = parsed.features.map((value, index): AnalysisGeoJsonFeature => {
    const label = `Área ${index + 1}`;
    if (!record(value) || value.type !== "Feature" || !record(value.geometry) || value.geometry.type !== "Polygon") {
      throw new Error(`${label}: solo se admiten Features con geometría Polygon.`);
    }
    if (!Array.isArray(value.geometry.coordinates) || value.geometry.coordinates.length !== 1) {
      throw new Error(`${label}: se admite un único anillo exterior, sin agujeros.`);
    }
    const ring = value.geometry.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4 || ring.length > 501) {
      throw new Error(`${label}: el anillo debe tener entre 4 y 501 posiciones.`);
    }
    const points: number[][] = ring.map((position) => {
      if (!Array.isArray(position) || position.length !== 2 ||
          position.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate)) ||
          position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) {
        throw new Error(`${label}: coordenadas inválidas; se espera WGS84 [longitud, latitud].`);
      }
      return [position[0], position[1]];
    });
    const first = points[0], last = points[points.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error(`${label}: el anillo debe estar cerrado.`);
    let twiceArea = 0;
    for (let i = 0; i < points.length - 1; i++) {
      twiceArea += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1];
    }
    if (Math.abs(twiceArea) < 1e-10) throw new Error(`${label}: el polígono tiene área nula.`);
    const name = record(value.properties) && typeof value.properties.name === "string" && value.properties.name.trim()
      ? value.properties.name.trim()
      : `Humedal ${index + 1}`;
    return { type: "Feature", properties: { name }, geometry: { type: "Polygon", coordinates: [points] } };
  });

  const preview = features.map((feature, index): WetlandFeature => ({
    type: "Feature",
    properties: { wetlandId: index + 1, name: feature.properties.name, salar: salarName, thresholdNdwi: 0 },
    geometry: feature.geometry,
  }));
  return { features, preview };
}
