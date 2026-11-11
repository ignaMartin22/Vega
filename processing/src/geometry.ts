import {
  area,
  bbox,
  booleanValid,
  cleanCoords,
  difference,
  feature,
  featureCollection,
  intersect,
  kinks,
  rewind,
  truncate,
} from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { createHash } from "node:crypto";
export type Surface = Polygon | MultiPolygon;
export type SurfaceFeature = Feature<Surface>;
const boundsCache = new WeakMap<Surface, [number, number, number, number]>();
export function extent(geometry: Surface): [number, number, number, number] {
  let value = boundsCache.get(geometry);
  if (!value) {
    value = bbox(feature(geometry)) as [number, number, number, number];
    boundsCache.set(geometry, value);
  }
  return value;
}
export function polygons(geometry: Surface): number[][][][] {
  return geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates;
}
export function mapSurface(
  geometry: Surface,
  transform: (point: number[]) => number[],
): Surface {
  return geometry.type === "Polygon"
    ? {
        type: "Polygon",
        coordinates: geometry.coordinates.map((r) => r.map(transform)),
      }
    : {
        type: "MultiPolygon",
        coordinates: geometry.coordinates.map((p) =>
          p.map((r) => r.map(transform)),
        ),
      };
}
export function contains([x, y]: number[], geometry: Surface): boolean {
  const ring = (points: number[][]) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i],
        [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  };
  return polygons(geometry).some((p) => ring(p[0]) && !p.slice(1).some(ring));
}
export function validateSurface(raw: unknown): Surface {
  const geometry = raw as Surface;
  if (
    !geometry ||
    !["Polygon", "MultiPolygon"].includes(geometry.type) ||
    !Array.isArray(geometry.coordinates)
  )
    throw new Error("Se requiere Polygon o MultiPolygon");
  let count = 0;
  for (const polygon of polygons(geometry)) {
    if (!Array.isArray(polygon) || !polygon.length)
      throw new Error("Polígono vacío");
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4)
        throw new Error("Anillo inválido");
      for (const p of ring) {
        if (
          !Array.isArray(p) ||
          p.length !== 2 ||
          p.some((n) => !Number.isFinite(n)) ||
          Math.abs(p[0]) > 180 ||
          Math.abs(p[1]) > 90
        )
          throw new Error("Coordenadas inválidas");
        count++;
      }
      if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])
        throw new Error("El anillo debe estar cerrado");
    }
  }
  if (count > 20000) throw new Error("Máximo 20.000 coordenadas por área");
  const f = feature(geometry);
  if (!booleanValid(f) || kinks(f).features.length || area(f) < 1)
    throw new Error("Geometría inválida, cruzada o sin área");
  return geometry;
}
/** Identidad independiente del vértice inicial, orientación, orden de anillos y partes. */
export function canonicalSurface(geometry: Surface): Surface {
  const cleaned = (
    rewind(
      cleanCoords(
        truncate(feature(geometry), { precision: 7, coordinates: 2 }),
      ),
      { reverse: false },
    ) as SurfaceFeature
  ).geometry;
  const rotate = (ring: number[][]) => {
    const open = ring.slice(0, -1);
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (
        open[i][0] < open[best][0] ||
        (open[i][0] === open[best][0] && open[i][1] < open[best][1])
      )
        best = i;
    const result = [...open.slice(best), ...open.slice(0, best)];
    return [...result, result[0]];
  };
  const parts = polygons(cleaned)
    .map((p) => [
      rotate(p[0]),
      ...p
        .slice(1)
        .map(rotate)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return parts.length === 1
    ? { type: "Polygon", coordinates: parts[0] }
    : { type: "MultiPolygon", coordinates: parts };
}
export const geometryHash = (geometry: Surface) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalSurface(geometry)))
    .digest("hex");
export function within(
  geometry: Surface,
  boundary: Surface,
  tolerance = 1,
): boolean {
  const outside = difference(
    featureCollection([feature(geometry), feature(boundary)]),
  );
  return !outside || area(outside) <= tolerance;
}
export function overlap(a: Surface, b: Surface): number {
  const aa = extent(a),
    bb = extent(b);
  if (aa[0] > bb[2] || aa[2] < bb[0] || aa[1] > bb[3] || aa[3] < bb[1])
    return 0;
  const cut = intersect(featureCollection([feature(a), feature(b)]));
  return cut ? area(cut) : 0;
}
