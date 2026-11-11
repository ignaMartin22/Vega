import type { WetlandFeature } from "./source";

const MAX_FEATURES = 100;
const MAX_RING_POINTS = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the GeoJSON profile accepted by Vega.
 * Coordinates must follow RFC 7946 order (longitude, latitude) in WGS84.
 */
export function parseWetlandsGeoJson(input: string): WetlandFeature[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }

  if (!isRecord(parsed) || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("Se esperaba un GeoJSON FeatureCollection.");
  }
  if (parsed.features.length === 0 || parsed.features.length > MAX_FEATURES) {
    throw new Error(`El archivo debe contener entre 1 y ${MAX_FEATURES} humedales.`);
  }

  const ids = new Set<number>();
  return parsed.features.map((rawFeature, index) => {
    const label = `Humedal ${index + 1}`;
    if (!isRecord(rawFeature) || rawFeature.type !== "Feature" || !isRecord(rawFeature.properties)) {
      throw new Error(`${label}: cada elemento debe ser una Feature con properties.`);
    }

    const properties = rawFeature.properties;
    const wetlandId = properties.wetlandId;
    const name = properties.name;
    const salar = properties.salar;
    const thresholdNdwi = properties.thresholdNdwi;

    if (!Number.isInteger(wetlandId) || (wetlandId as number) < 1 || (wetlandId as number) > 4_294_967_295) {
      throw new Error(`${label}: wetlandId debe ser un entero positivo de 32 bits.`);
    }
    if (ids.has(wetlandId as number)) {
      throw new Error(`${label}: el wetlandId ${wetlandId} está duplicado.`);
    }
    ids.add(wetlandId as number);

    if (typeof name !== "string" || !name.trim()) {
      throw new Error(`${label}: falta properties.name.`);
    }
    if (typeof salar !== "string" || !salar.trim()) {
      throw new Error(`${label}: falta properties.salar.`);
    }
    if (
      typeof thresholdNdwi !== "number" ||
      !Number.isFinite(thresholdNdwi) ||
      thresholdNdwi < -10_000 ||
      thresholdNdwi > 10_000
    ) {
      throw new Error(`${label}: thresholdNdwi debe ser un número entre -10000 y 10000 (NDWI × 10000).`);
    }

    const geometry = rawFeature.geometry;
    if (!isRecord(geometry) || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
      throw new Error(`${label}: por ahora Vega acepta geometrías Polygon (no MultiPolygon).`);
    }
    if (geometry.coordinates.length === 0) {
      throw new Error(`${label}: el polígono no tiene anillo exterior.`);
    }

    let totalPoints = 0;
    for (const ring of geometry.coordinates) {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new Error(`${label}: cada anillo debe tener al menos 4 posiciones.`);
      }
      totalPoints += ring.length;
      if (totalPoints > MAX_RING_POINTS) {
        throw new Error(`${label}: el polígono supera el límite de ${MAX_RING_POINTS} posiciones.`);
      }
      for (const position of ring) {
        if (
          !Array.isArray(position) ||
          position.length < 2 ||
          typeof position[0] !== "number" ||
          typeof position[1] !== "number" ||
          !Number.isFinite(position[0]) ||
          !Number.isFinite(position[1]) ||
          position[0] < -180 ||
          position[0] > 180 ||
          position[1] < -90 ||
          position[1] > 90
        ) {
          throw new Error(`${label}: coordenadas inválidas; se esperan [longitud, latitud] en EPSG:4326.`);
        }
      }
      const first = ring[0] as number[];
      const last = ring[ring.length - 1] as number[];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        throw new Error(`${label}: cada anillo debe estar cerrado (primera y última coordenada iguales).`);
      }
    }

    return {
      type: "Feature",
      properties: {
        wetlandId: wetlandId as number,
        name: name.trim(),
        salar: salar.trim(),
        thresholdNdwi,
      },
      geometry: { type: "Polygon", coordinates: geometry.coordinates as number[][][] },
    };
  });
}
