import { readFileSync } from "node:fs";
import type { WetlandProperties } from "@vega/shared";
export interface WetlandFeature {
  type: "Feature";
  properties: WetlandProperties;
  geometry: { type: "Polygon"; coordinates: number[][][] };
}
export function loadWetlands(): WetlandFeature[] {
  const collection = JSON.parse(readFileSync(new URL("../../sample-data/wetlands.geojson", import.meta.url), "utf8"));
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) throw new Error("GeoJSON inválido");
  const ids = new Set<number>();
  for (const f of collection.features as WetlandFeature[]) {
    const p = f.properties;
    if (f.type !== "Feature" || f.geometry?.type !== "Polygon" || !p || !Number.isInteger(p.wetlandId) || p.wetlandId <= 0 || ids.has(p.wetlandId)) throw new Error("Humedal inválido o ID duplicado");
    ids.add(p.wetlandId);
    if (!p.name || !p.salar || !Number.isInteger(p.thresholdNdwi) || Math.abs(p.thresholdNdwi) > 10000) throw new Error(`Propiedades inválidas en ${p.wetlandId}`);
    if (!f.geometry.coordinates.length) throw new Error("Polígono vacío");
    for (const ring of f.geometry.coordinates) {
      if (ring.length < 4 || ring.some((xy) => xy.length < 2 || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1]) || Math.abs(xy[0]) > 180 || Math.abs(xy[1]) > 90) || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) throw new Error(`Anillo inválido en ${p.wetlandId}`);
    }
  }
  return collection.features;
}
export function bbox(f: WetlandFeature): [number, number, number, number] {
  const pts = f.geometry.coordinates[0];
  const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
