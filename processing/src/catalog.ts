import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadWetlands, type WetlandFeature } from "./wetlands.js";
import { monthlyWindows, resolvePeriod, type Period } from "./period.js";

export class InputError extends Error {}
export const salar = {
  id: "hombre-muerto", name: "Salar del Hombre Muerto", provinces: ["salta", "catamarca"],
  bbox: [-67.2, -25.5, -66.8, -25.25] as [number,number,number,number],
  boundaryKind: "pilot_extent", boundaryValidated: false,
  source: "https://kba.avesargentinas.org.ar/explorar/aica/salar-del-hombre-muerto/",
  note: "Extensión de consulta piloto, no delimitación oficial del salar. AOI experimentales.",
};
export function catalog(province?: string) {
  if (province && !["salta","jujuy","catamarca"].includes(province)) throw new InputError("Provincia inválida");
  return {
    coverage: { complete: false, scope: ["salta","jujuy","catamarca"], note: "Catálogo piloto: falta incorporar y validar los demás salares y límites provinciales." },
    salars: !province || salar.provinces.includes(province) ? [salar] : [],
  };
}
export const catalogWetlands = () => loadWetlands();

type XY = [number,number];
function cross(a: number[], b: number[], c: number[]): number {
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
}
function onSegment(a: number[], b: number[], p: number[]): boolean {
  return Math.abs(cross(a,b,p)) < 1e-14 && p[0]>=Math.min(a[0],b[0]) && p[0]<=Math.max(a[0],b[0]) && p[1]>=Math.min(a[1],b[1]) && p[1]<=Math.max(a[1],b[1]);
}
function intersects(a: number[], b: number[], c: number[], d: number[]): boolean {
  return (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) || onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b);
}

/** Valida Polygon simple. Si se pasa un bbox, restringe al salar piloto; null permite AOI externos aportados por el usuario. */
export function validateDrawnArea(raw: unknown, bounds: [number,number,number,number] | null = salar.bbox): { name: string; geometry: WetlandFeature["geometry"] } {
  const value = raw as { type?: string; properties?: {name?: unknown}; geometry?: {type?: string;coordinates?: unknown} };
  if (!value || value.type!=="Feature" || value.geometry?.type!=="Polygon") throw new InputError("Este incremento acepta Features Polygon; MultiPolygon todavía no está soportado");
  const rings = value.geometry.coordinates;
  if (!Array.isArray(rings) || rings.length!==1 || !Array.isArray(rings[0])) throw new InputError("Este incremento acepta un anillo exterior sin agujeros");
  const ring: unknown[] = rings[0];
  if (ring.length<4 || ring.length>501) throw new InputError("El contorno necesita entre 4 y 501 coordenadas");
  const [west,south,east,north] = bounds ?? [-180,-90,180,90];
  for (const xy of ring) {
    if (!Array.isArray(xy) || xy.length!==2 || !xy.every((v) => typeof v==="number" && Number.isFinite(v)) ||
        xy[0]<west || xy[0]>east || xy[1]<south || xy[1]>north) {
      throw new InputError(bounds ? "Coordenadas inválidas o fuera de la extensión piloto del salar" : "Coordenadas fuera del rango WGS84");
    }
  }
  const points = ring as XY[];
  if (points[0][0]!==points.at(-1)![0] || points[0][1]!==points.at(-1)![1]) throw new InputError("El anillo debe estar cerrado");
  let twiceArea = 0;
  for (let i=0;i<points.length-1;i++) {
    const a=points[i], b=points[i+1];
    if (a[0]===b[0] && a[1]===b[1]) throw new InputError("El contorno tiene vértices consecutivos repetidos");
    twiceArea+=a[0]*b[1]-b[0]*a[1];
    for (let j=i+2;j<points.length-1;j++) {
      if (i===0 && j===points.length-2) continue;
      if (intersects(a,b,points[j],points[j+1])) throw new InputError("El contorno se cruza consigo mismo");
    }
  }
  if (Math.abs(twiceArea)<1e-10) throw new InputError("Área nula o demasiado pequeña");
  const lonSpan=Math.max(...points.map((p)=>p[0]))-Math.min(...points.map((p)=>p[0]));
  const latSpan=Math.max(...points.map((p)=>p[1]))-Math.min(...points.map((p)=>p[1]));
  if (lonSpan*latSpan*111*111>100) throw new InputError("La ventana del área supera 100 km²; dividila en zonas más pequeñas");
  const name = value.properties?.name;
  if (name!==undefined && (typeof name!=="string" || !name.trim() || name.length>120)) throw new InputError("Nombre de área inválido");
  return { name: typeof name==="string" ? name.trim() : "Área dibujada", geometry:{type:"Polygon",coordinates:[points]} };
}

export interface AnalysisRequest {
  salarId: string;
  salarName: string;
  period: Period;
  windows: ReturnType<typeof monthlyWindows>;
  areas: { feature: WetlandFeature; geometryHash: string; identityStatus: "catalog_pilot" | "provisional" }[];
}

/** IDs reservados localmente, persistidos con control de colisiones; requieren revisión antes del sellado. */
export class AreaRegistry {
  private entries: Record<string,number>;
  private file: string;
  constructor(directory: string) {
    mkdirSync(directory,{recursive:true});
    this.file=join(directory,"areas.json");
    this.entries=existsSync(this.file) ? JSON.parse(readFileSync(this.file,"utf8")) : {};
  }
  id(hash: string): number {
    if (this.entries[hash]) return this.entries[hash];
    let id=1_000_000_000+Number.parseInt(hash.slice(0,8),16)%2_000_000_000;
    const used=new Set(Object.values(this.entries));
    while (used.has(id)) id = id===2_999_999_999 ? 1_000_000_000 : id+1;
    this.entries[hash]=id;
    writeFileSync(`${this.file}.tmp`,JSON.stringify(this.entries,null,2)+"\n");
    renameSync(`${this.file}.tmp`,this.file);
    return id;
  }
}

export function parseRequest(raw: unknown, registry: AreaRegistry, now = new Date()): AnalysisRequest {
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) throw new InputError("La solicitud debe ser un objeto JSON");
  const input=raw as Record<string,unknown>;
  const requestedSalarId=input.salarId;
  if (typeof requestedSalarId!=="string" || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(requestedSalarId)) {
    throw new InputError("salarId debe ser un identificador estable en formato slug");
  }
  const isPilot=requestedSalarId===salar.id;
  const requestedSalarName=isPilot ? salar.name : input.salarName;
  if (typeof requestedSalarName!=="string" || !requestedSalarName.trim() || requestedSalarName.length>120) {
    throw new InputError("Para un salar fuera del catálogo indicá salarName (máximo 120 caracteres)");
  }
  if (input.from!==undefined && typeof input.from!=="string" || input.to!==undefined && typeof input.to!=="string") throw new InputError("Fechas inválidas");
  let period: Period;
  try { period=resolvePeriod(input.from as string|undefined,input.to as string|undefined,now); }
  catch (error) { throw new InputError((error as Error).message); }

  const ids=input.wetlandIds ?? [];
  let drawings: unknown[]=[];
  if (input.geojson!==undefined && input.areas!==undefined) throw new InputError("Enviá geojson o areas, no ambos");
  if (input.geojson!==undefined) {
    const collection=input.geojson as {type?:unknown;features?:unknown};
    if (!collection || collection.type!=="FeatureCollection" || !Array.isArray(collection.features)) {
      throw new InputError("geojson debe ser una FeatureCollection válida");
    }
    drawings=collection.features;
  } else {
    const supplied=input.areas ?? [];
    if (!Array.isArray(supplied)) throw new InputError("areas debe ser un array de Features GeoJSON");
    drawings=supplied;
  }
  if (!Array.isArray(ids) || ids.length+drawings.length<1 || ids.length+drawings.length>5) {
    throw new InputError("Elegí entre 1 y 5 áreas");
  }
  if (!isPilot && ids.length) throw new InputError("Los IDs de catálogo solo están disponibles para el Salar del Hombre Muerto; importá GeoJSON para otro salar");

  const selected: {feature:WetlandFeature;identityStatus:"catalog_pilot"|"provisional"}[]=[];
  if (isPilot) {
    const available=catalogWetlands();
    for (const id of ids) {
      const feature=available.find((w)=>w.properties.wetlandId===id);
      if (!feature) throw new InputError("Humedal de catálogo desconocido");
      selected.push({feature,identityStatus:"catalog_pilot"});
    }
  }
  const validated=drawings.map((feature)=>validateDrawnArea(feature,isPilot?salar.bbox:null));
  for (const area of validated) {
    const geometryHash=createHash("sha256").update(JSON.stringify(area.geometry)).digest("hex");
    const identityKey=createHash("sha256").update(requestedSalarId+":"+geometryHash).digest("hex");
    selected.push({feature:{type:"Feature",properties:{wetlandId:registry.id(identityKey),name:area.name,salar:requestedSalarName.trim(),thresholdNdwi:0},geometry:area.geometry},identityStatus:"provisional"});
  }
  const seen=new Set<string>();
  const areas: AnalysisRequest["areas"]=[];
  for (const area of selected) {
    const geometryHash=createHash("sha256").update(JSON.stringify(area.feature.geometry)).digest("hex");
    if (seen.has(geometryHash)) continue;
    seen.add(geometryHash); areas.push({...area,geometryHash});
  }
  return {salarId:requestedSalarId,salarName:requestedSalarName.trim(),period,windows:monthlyWindows(period),areas};
}
