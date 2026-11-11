import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { area, feature, featureCollection, union } from "@turf/turf";
import { loadWetlands, type WetlandFeature } from "./wetlands.js";
import { monthlyWindows, resolvePeriod, type Period } from "./period.js";
import {
  canonicalSurface,
  extent,
  geometryHash,
  overlap,
  validateSurface,
  within,
  type Surface,
  type SurfaceFeature,
} from "./geometry.js";
export class InputError extends Error {}
export interface Salar {
  id: string;
  name: string;
  provinces: string[];
  bbox: [number, number, number, number];
  geometry: Surface;
  monitoringGeometry: Surface;
  source: string;
  sourceId: string;
  boundaryValidated: boolean;
  boundaryKind?: "user_selection" | "user_salar_outline";
}
const data = new URL("../data/", import.meta.url);
const salars: Salar[] = JSON.parse(
  readFileSync(new URL("salars.json", data), "utf8"),
);
const region: Surface = JSON.parse(
  readFileSync(new URL("region.geojson", data), "utf8"),
).geometry;
const water: SurfaceFeature[] = JSON.parse(
  readFileSync(new URL("wetlands.geojson", data), "utf8"),
).features;
const provinceFeatures: SurfaceFeature[] = JSON.parse(
  readFileSync(new URL("provinces.geojson", data), "utf8"),
).features;
export const catalogManifest = JSON.parse(
  readFileSync(new URL("manifest.json", data), "utf8"),
);
export function findSalar(id: string): Salar | undefined {
  return salars.find((s) => s.id === id);
}
export const salar = findSalar("hombre-muerto")!;
export function catalog(province?: string) {
  if (province && !["salta", "jujuy", "catamarca"].includes(province))
    throw new InputError("Provincia inválida");
  return {
    coverage: {
      complete: true,
      scope: catalogManifest.scope,
      definition: catalogManifest.coverage,
      sourceSnapshot: catalogManifest.retrievedAt,
    },
    salars: salars
      .filter((s) => !province || s.provinces.includes(province))
      .map(({ geometry, monitoringGeometry, ...s }) => s),
  };
}
export function catalogWetlands(salarId = "hombre-muerto"): WetlandFeature[] {
  const selected = findSalar(salarId);
  if (!selected) throw new InputError("Salar desconocido");
  const official = water
    .filter((f) => (f.properties!.salarIds as string[]).includes(salarId))
    .map((f) => ({
      type: "Feature" as const,
      properties: {
        ...f.properties,
        wetlandId: Number(f.properties!.wetlandId),
        name: String(f.properties!.name),
        salar: selected.name,
        thresholdNdwi: 0,
      },
      geometry: f.geometry,
    }));
  return salarId === "hombre-muerto"
    ? [...loadWetlands(), ...official]
    : official;
}
export function validateDrawnArea(
  raw: unknown,
  selected: Salar = salar,
): { name: string; geometry: Surface } {
  const value = raw as {
    type?: string;
    properties?: { name?: unknown };
    geometry?: unknown;
  };
  if (!value || value.type !== "Feature")
    throw new InputError("Se requiere una Feature GeoJSON");
  let geometry: Surface;
  try {
    geometry = validateSurface(
      canonicalSurface(validateSurface(value.geometry)),
    );
  } catch (error) {
    throw new InputError((error as Error).message);
  }
  if (area(feature(geometry)) > 250_000_000)
    throw new InputError(
      "Máximo 250 km² por área dibujada; dividila en humedales",
    );
  if (!within(geometry, region, 10))
    throw new InputError(
      "El área debe estar dentro de Salta, Jujuy o Catamarca",
    );
  if (!within(geometry, selected.monitoringGeometry, 10))
    throw new InputError(
      "El área debe estar en el salar elegido o su entorno de monitoreo de 15 km",
    );
  const name = value.properties?.name;
  if (
    name !== undefined &&
    (typeof name !== "string" || !name.trim() || name.length > 120)
  )
    throw new InputError("Nombre inválido");
  return {
    name: typeof name === "string" ? name.trim() : "Área dibujada",
    geometry,
  };
}
export interface AnalysisRequest {
  salarId: string;
  salarName?: string;
  period: Period;
  windows: ReturnType<typeof monthlyWindows>;
  salar?: Salar;
  areas: {
    feature: WetlandFeature;
    geometryHash: string;
    identityStatus: "catalog_pilot" | "catalog" | "provisional";
  }[];
}
export class AreaRegistry {
  private entries: Record<string, number>;
  private file: string;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true });
    this.file = join(directory, "areas.json");
    this.entries = existsSync(this.file)
      ? JSON.parse(readFileSync(this.file, "utf8"))
      : {};
  }
  id(hash: string): number {
    if (this.entries[hash]) return this.entries[hash];
    let id =
      1_000_000_000 + (Number.parseInt(hash.slice(0, 8), 16) % 2_000_000_000);
    const used = new Set(Object.values(this.entries));
    while (used.has(id)) id = id === 2_999_999_999 ? 1_000_000_000 : id + 1;
    this.entries[hash] = id;
    writeFileSync(
      `${this.file}.tmp`,
      JSON.stringify(this.entries, null, 2) + "\n",
    );
    renameSync(`${this.file}.tmp`, this.file);
    return id;
  }
}
export function parseRequest(
  raw: unknown,
  registry: AreaRegistry,
  now = new Date(),
): AnalysisRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new InputError("Se requiere un objeto JSON");
  const input = raw as Record<string, unknown>;
  let selected = findSalar(String(input.salarId));
  if (
    (input.from !== undefined && typeof input.from !== "string") ||
    (input.to !== undefined && typeof input.to !== "string")
  )
    throw new InputError("Fechas inválidas");
  let period: Period;
  try {
    period = resolvePeriod(
      input.from as string | undefined,
      input.to as string | undefined,
      now,
    );
  } catch (e) {
    throw new InputError((e as Error).message);
  }
  if (input.areas !== undefined && input.geojson !== undefined)
    throw new InputError("Enviá areas o geojson, no ambos");
  const collection = input.geojson as
    { type?: string; features?: unknown[] } | undefined;
  if (
    input.geojson !== undefined &&
    (!collection ||
      collection.type !== "FeatureCollection" ||
      !Array.isArray(collection.features))
  )
    throw new InputError("geojson debe ser una FeatureCollection");
  const ids = input.wetlandIds ?? [],
    drawings = collection?.features ?? input.areas ?? [];
  if (
    !Array.isArray(ids) ||
    !Array.isArray(drawings) ||
    ids.length + drawings.length < 1 ||
    ids.length + drawings.length > 5
  )
    throw new InputError("Elegí entre 1 y 5 áreas");
  if (!selected) {
    const name = input.salarName;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 120 ||
      typeof input.salarId !== "string" ||
      !/^[-a-z0-9]{2,80}$/.test(input.salarId)
    )
      throw new InputError(
        "Salar desconocido; usá ID de catálogo o salarName y GeoJSON regional",
      );
    if (!drawings.length || ids.length)
      throw new InputError(
        "Un salar fuera del catálogo necesita áreas GeoJSON, sin IDs de catálogo",
      );
    let shapes: Surface[];
    try {
      shapes = drawings.map((d) =>
        validateSurface(
          canonicalSurface(
            validateSurface((d as { geometry?: unknown })?.geometry),
          ),
        ),
      );
    } catch (error) {
      throw new InputError((error as Error).message);
    }
    const normal = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\b(salar|salinas?|del?|las?|los?|el)\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const candidates = salars.filter(
      (s) =>
        normal(s.name) === normal(name) &&
        shapes.every((g) => within(g, s.monitoringGeometry, 10)),
    );
    if (candidates.length === 1) selected = candidates[0];
    else {
      let geometry =
        shapes.length === 1
          ? shapes[0]
          : union(featureCollection(shapes.map((g) => feature(g))))!.geometry;
      if (input.salarGeometry !== undefined)
        try {
          geometry = canonicalSurface(validateSurface(input.salarGeometry));
        } catch (error) {
          throw new InputError((error as Error).message);
        }
      if (!within(geometry, region, 10))
        throw new InputError("El salar debe estar en Salta, Jujuy o Catamarca");
      selected = {
        id: input.salarId,
        name: name.trim(),
        provinces: provinceFeatures
          .filter((p) => overlap(geometry, p.geometry) > 1)
          .map((p) => String(p.properties!.nam).toLowerCase()),
        bbox: extent(geometry),
        geometry,
        monitoringGeometry: input.salarGeometry ? geometry : region,
        source: "Geometría aportada por el usuario; no límite oficial",
        sourceId: input.salarId,
        boundaryValidated: false,
        boundaryKind: input.salarGeometry
          ? "user_salar_outline"
          : "user_selection",
      };
    }
  }
  const available = findSalar(selected.id) ? catalogWetlands(selected.id) : [],
    areas: AnalysisRequest["areas"] = [],
    seen = new Set<string>();
  const append = (
    feature: WetlandFeature,
    identityStatus: AnalysisRequest["areas"][number]["identityStatus"],
  ) => {
    const hash = geometryHash(feature.geometry);
    if (!seen.has(hash)) {
      seen.add(hash);
      areas.push({ feature, identityStatus, geometryHash: hash });
    }
  };
  const chosen = ids.map((id) => {
    const f = available.find((w) => w.properties.wetlandId === id);
    if (!f) throw new InputError("Humedal no asociado al salar");
    return f;
  });
  const validated = drawings.map((d) => validateDrawnArea(d, selected));
  for (const f of chosen)
    append(f, f.properties.wetlandId <= 3 ? "catalog_pilot" : "catalog");
  for (const a of validated)
    append(
      {
        type: "Feature",
        properties: {
          // Identidad provisional por salar + geometría: la misma área en otro salar recibe otro ID.
          wetlandId: registry.id(
            createHash("sha256")
              .update(`${selected.id}:${geometryHash(a.geometry)}`)
              .digest("hex"),
          ),
          name: a.name,
          salar: selected.name,
          thresholdNdwi: 0,
        },
        geometry: a.geometry,
      },
      "provisional",
    );
  return {
    salarId: selected.id,
    salarName: selected.name,
    salar: selected,
    period,
    windows: monthlyWindows(period),
    areas,
  };
}
