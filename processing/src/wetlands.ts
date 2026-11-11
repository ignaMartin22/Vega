import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { WetlandProperties } from "@vega/shared";
import { extent, type Surface } from "./geometry.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FEATURES = 100;

export interface WetlandFeature {
  type: "Feature";
  properties: WetlandProperties;
  geometry: Surface;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRing(value: unknown, featureIndex: number, ringIndex: number): number[][] {
  if (!Array.isArray(value) || value.length < 4) {
    throw new Error(`Feature ${featureIndex}: el anillo ${ringIndex} debe tener al menos 4 posiciones`);
  }

  const ring = value.map((position, positionIndex) => {
    if (!Array.isArray(position) || position.length < 2) {
      throw new Error(`Feature ${featureIndex}: posición inválida en anillo ${ringIndex}`);
    }
    const [longitude, latitude] = position;
    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new Error(`Feature ${featureIndex}: coordenadas fuera de WGS84 en anillo ${ringIndex}, posición ${positionIndex}`);
    }
    return [longitude, latitude];
  });

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error(`Feature ${featureIndex}: el anillo ${ringIndex} no está cerrado`);
  }

  let twiceArea = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    twiceArea += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  if (Math.abs(twiceArea) < 1e-12) {
    throw new Error(`Feature ${featureIndex}: el anillo ${ringIndex} tiene área nula`);
  }
  return ring;
}

/** Un anillo es un array de posiciones [lon, lat]; sirve para detectar anidamiento incorrecto. */
const isRingShape = (value: unknown) =>
  Array.isArray(value) && value.length > 0 && value.every((p) => Array.isArray(p) && p.every((n) => typeof n === "number"));

function validatePolygon(value: unknown, featureIndex: number, kind: string): number[][][] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isRingShape)) {
    throw new Error(`Feature ${featureIndex}: geometría ${kind} mal formada`);
  }
  return value.map((ring, ringIndex) => validateRing(ring, featureIndex, ringIndex));
}

function validateGeometry(geometry: Record<string, unknown>, index: number): Surface {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: validatePolygon(geometry.coordinates, index, "Polygon") };
  }
  if (geometry.type === "MultiPolygon") {
    const parts = geometry.coordinates;
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error(`Feature ${index}: geometría MultiPolygon mal formada`);
    }
    return { type: "MultiPolygon", coordinates: parts.map((part) => validatePolygon(part, index, "MultiPolygon")) };
  }
  throw new Error(`Feature ${index}: solo se admiten geometrías Polygon o MultiPolygon`);
}

export function parseWetlandsGeoJson(raw: string): WetlandFeature[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("El archivo no contiene JSON válido");
  }

  if (!isRecord(parsed) || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("El GeoJSON debe ser una FeatureCollection con un array features");
  }
  const collection = parsed as unknown as GeoJsonFeatureCollection;
  if (collection.features.length === 0 || collection.features.length > MAX_FEATURES) {
    throw new Error(`La colección debe contener entre 1 y ${MAX_FEATURES} humedales`);
  }

  const ids = new Set<number>();
  return collection.features.map((candidate, index) => {
    if (!isRecord(candidate) || candidate.type !== "Feature" || !isRecord(candidate.properties) || !isRecord(candidate.geometry)) {
      throw new Error(`Feature ${index}: estructura inválida`);
    }
    const properties = candidate.properties;
    const wetlandId = properties.wetlandId;
    const name = properties.name;
    const salar = properties.salar;
    const thresholdNdwi = properties.thresholdNdwi;

    if (!Number.isInteger(wetlandId) || (wetlandId as number) < 1 || (wetlandId as number) > 0xffffffff) {
      throw new Error(`Feature ${index}: wetlandId debe ser un entero positivo uint32`);
    }
    if (ids.has(wetlandId as number)) throw new Error(`Feature ${index}: wetlandId duplicado (${wetlandId})`);
    ids.add(wetlandId as number);
    if (typeof name !== "string" || !name.trim() || typeof salar !== "string" || !salar.trim()) {
      throw new Error(`Feature ${index}: name y salar son obligatorios`);
    }
    if (!Number.isInteger(thresholdNdwi) || (thresholdNdwi as number) < -10000 || (thresholdNdwi as number) > 10000) {
      throw new Error(`Feature ${index}: thresholdNdwi debe ser un entero entre -10000 y 10000`);
    }

    return {
      type: "Feature",
      properties: { wetlandId: wetlandId as number, name, salar, thresholdNdwi: thresholdNdwi as number },
      geometry: validateGeometry(candidate.geometry, index),
    };
  });
}

/**
 * Carga un GeoJSON configurable mediante WETLANDS_GEOJSON.
 * Si no se indica la variable, conserva el dataset de demostración del repositorio.
 */
export function loadWetlands(filePath = process.env.WETLANDS_GEOJSON): WetlandFeature[] {
  const path = filePath
    ? resolve(process.cwd(), filePath)
    : fileURLToPath(new URL("../../sample-data/wetlands.geojson", import.meta.url));
  const size = statSync(path).size;
  if (size > MAX_FILE_BYTES) throw new Error(`El GeoJSON supera el límite de ${MAX_FILE_BYTES / (1024 * 1024)} MB`);
  return parseWetlandsGeoJson(readFileSync(path, "utf8"));
}

/** [minLon, minLat, maxLon, maxLat] de la geometría (Polygon o MultiPolygon). */
export function bbox(f: WetlandFeature): [number, number, number, number] {
  return extent(f.geometry);
}
