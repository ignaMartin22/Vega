import { readFileSync } from "node:fs";
import type { WetlandProperties } from "@vega/shared";

export interface WetlandFeature {
  type: "Feature";
  properties: WetlandProperties;
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export function loadWetlands(): WetlandFeature[] {
  const url = new URL("../../sample-data/wetlands.geojson", import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")).features;
}

/** [minLon, minLat, maxLon, maxLat] del polígono, para la búsqueda STAC. */
export function bbox(f: WetlandFeature): [number, number, number, number] {
  const pts = f.geometry.coordinates[0];
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
