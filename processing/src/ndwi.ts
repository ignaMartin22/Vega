import { fromUrl, type GeoTIFFImage } from "geotiff";
import proj4 from "proj4";
import type { StacAsset, StacItem } from "./stac.js";
import type { WetlandFeature } from "./wetlands.js";
import { contains, mapSurface, polygons } from "./geometry.js";

export interface NdwiResult {
  ndwi: number;
  validPixels: number;
  totalPixels: number;
}
export type Point = [number, number];

/** Ray casting, con agujeros del polígono excluidos por el llamador. */
export function inRing([x, y]: Point, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Earth Search ya armoniza algunos COG: no aplicar el offset dos veces. */
export function calibration(
  item: StacItem,
  asset: StacAsset,
): { scale: number; offset: number; nodata: number } {
  const band = asset["raster:bands"]?.[0];
  const scale = band?.scale;
  if (!Number.isFinite(scale) || scale! <= 0)
    throw new Error(`${item.id}: falta escala de reflectancia`);
  const applied = item.properties["earthsearch:boa_offset_applied"];
  const baseline = Number(item.properties["s2:processing_baseline"]);
  let offset: number;
  if (applied === true) offset = 0;
  else if (applied === false && Number.isFinite(band?.offset))
    offset = band!.offset!;
  else if (Number.isFinite(baseline) && baseline < 4) offset = 0;
  else
    throw new Error(
      `${item.id}: offset ambiguo; revisar metadatos antes de publicar`,
    );
  return { scale: scale!, offset, nodata: band?.nodata ?? 0 };
}

interface Grid {
  image: GeoTIFFImage;
  origin: number[];
  resolution: number[];
}
function grid(image: GeoTIFFImage): Grid {
  const origin = image.getOrigin();
  const resolution = image.getResolution();
  if (resolution[0] <= 0 || resolution[1] >= 0)
    throw new Error("Se requiere un COG north-up");
  return { image, origin, resolution };
}
function pixel(g: Grid, [x, y]: Point): Point {
  return [
    (x - g.origin[0]) / g.resolution[0],
    (y - g.origin[1]) / g.resolution[1],
  ];
}
function world(g: Grid, x: number, y: number): Point {
  return [g.origin[0] + x * g.resolution[0], g.origin[1] + y * g.resolution[1]];
}
function windowFor(g: Grid, points: Point[]): number[] {
  const pixels = points.map((p) => pixel(g, p));
  const xs = pixels.map((p) => p[0]),
    ys = pixels.map((p) => p[1]);
  const window = [
    Math.floor(Math.min(...xs)),
    Math.floor(Math.min(...ys)),
    Math.ceil(Math.max(...xs)),
    Math.ceil(Math.max(...ys)),
  ];
  // No promediar una fracción silenciosamente si el polígono cruza el borde del tile.
  if (
    window[0] < 0 ||
    window[1] < 0 ||
    window[2] > g.image.getWidth() ||
    window[3] > g.image.getHeight()
  ) {
    throw new Error("El polígono no está totalmente cubierto por la escena");
  }
  if (window[2] <= window[0] || window[3] <= window[1])
    throw new Error("Ventana vacía");
  return window;
}
const VALID_SCL = new Set([2, 4, 5, 6, 7]);

/** Evita elegir el tile vecino cuando STAC devuelve varias teselas para el AOI. */
export function coversWetland(
  item: StacItem,
  wetland: WetlandFeature,
): boolean {
  const epsg = item.properties["proj:epsg"];
  const asset = item.assets.green;
  const transform = asset?.["proj:transform"],
    shape = asset?.["proj:shape"];
  if (
    !epsg ||
    !((epsg >= 32601 && epsg <= 32660) || (epsg >= 32701 && epsg <= 32760)) ||
    !transform ||
    !shape ||
    transform[1] !== 0 ||
    transform[3] !== 0
  )
    return false;
  const crs = `+proj=utm +zone=${epsg % 100} ${epsg >= 32700 ? "+south" : ""} +datum=WGS84 +units=m +no_defs`;
  return polygons(wetland.geometry)
    .flatMap((p) => p[0])
    .every((p) => {
      const [x, y] = proj4("EPSG:4326", crs, p);
      const col = (x - transform[2]) / transform[0],
        row = (y - transform[5]) / transform[4];
      return col >= 0 && row >= 0 && col <= shape[1] && row <= shape[0];
    });
}

/** Cuenta la grilla fija del AOI sin descargar bandas (control de cobertura al reanudar). */
export function polygonPixelCount(
  item: StacItem,
  wetland: WetlandFeature,
): number {
  const epsg = item.properties["proj:epsg"];
  const t = item.assets.green?.["proj:transform"];
  if (!epsg || !t || t[1] !== 0 || t[3] !== 0)
    throw new Error("Falta transformación north-up para control de cobertura");
  const crs = `+proj=utm +zone=${epsg % 100} ${epsg >= 32700 ? "+south" : ""} +datum=WGS84 +units=m +no_defs`;
  const projected = mapSurface(wetland.geometry, (p) =>
    proj4("EPSG:4326", crs, p),
  );
  const points = polygons(projected).flatMap((p) => p[0]);
  const xs = points.map((p) => (p[0] - t[2]) / t[0]),
    ys = points.map((p) => (p[1] - t[5]) / t[4]);
  const x0 = Math.floor(Math.min(...xs)),
    x1 = Math.ceil(Math.max(...xs));
  const y0 = Math.floor(Math.min(...ys)),
    y1 = Math.ceil(Math.max(...ys));
  if ((x1 - x0) * (y1 - y0) > 10_000_000)
    throw new Error("Área demasiado grande para el MVP");
  let count = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const center: Point = [t[2] + (x + 0.5) * t[0], t[5] + (y + 0.5) * t[4]];
      if (contains(center, projected)) count++;
    }
  return count;
}

/** Ventana a resolución nativa; SCL se consulta por centro de píxel (vecino próximo). */
export async function computeNdwi(
  item: StacItem,
  wetland: WetlandFeature,
): Promise<NdwiResult> {
  const epsg = item.properties["proj:epsg"];
  if (
    !epsg ||
    !((epsg >= 32601 && epsg <= 32660) || (epsg >= 32701 && epsg <= 32760))
  ) {
    throw new Error(`${item.id}: se requiere CRS UTM WGS84`);
  }
  const zone = epsg % 100;
  const crs = `+proj=utm +zone=${zone} ${epsg >= 32700 ? "+south" : ""} +datum=WGS84 +units=m +no_defs`;
  const projected = mapSurface(wetland.geometry, (p) =>
    proj4("EPSG:4326", crs, p),
  );
  const points = polygons(projected).flatMap((p) => p[0]) as Point[];
  const assets = [item.assets.green, item.assets.nir, item.assets.scl];
  if (assets.some((a) => !a?.href))
    throw new Error(`${item.id}: faltan green, nir o scl`);
  const greenCal = calibration(item, assets[0]),
    nirCal = calibration(item, assets[1]);
  const signal = AbortSignal.timeout(180_000);
  const tiffs = await Promise.all(
    assets.map((a) => fromUrl(a.href, { allowFullFile: false }, signal)),
  );
  try {
    const [green, nir, scl] = await Promise.all(
      tiffs.map(async (t) => grid(await t.getImage())),
    );
    if (
      green.origin.slice(0, 2).some((v, i) => v !== nir.origin[i]) ||
      green.resolution.slice(0, 2).some((v, i) => v !== nir.resolution[i])
    )
      throw new Error("B03 y B08 no están alineadas");
    const bounds = windowFor(green, points);
    windowFor(nir, points);
    if ((bounds[2] - bounds[0]) * (bounds[3] - bounds[1]) > 10_000_000)
      throw new Error("Área demasiado grande para el MVP");
    // Límites exactos de la ventana B03: la ventana SCL puede tener un píxel extra.
    const sclBounds = windowFor(scl, [
      world(green, bounds[0], bounds[1]),
      world(green, bounds[2], bounds[3]),
    ]);
    const [g, n, s] = await Promise.all([
      green.image.readRasters({
        window: bounds,
        samples: [0],
        interleave: true,
        signal,
      }),
      nir.image.readRasters({
        window: bounds,
        samples: [0],
        interleave: true,
        signal,
      }),
      scl.image.readRasters({
        window: sclBounds,
        samples: [0],
        interleave: true,
        signal,
      }),
    ]);
    const width = bounds[2] - bounds[0],
      height = bounds[3] - bounds[1],
      sclWidth = sclBounds[2] - sclBounds[0];
    let sum = 0,
      validPixels = 0,
      totalPixels = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const center = world(green, bounds[0] + x + 0.5, bounds[1] + y + 0.5);
        if (!contains(center, projected)) continue;
        totalPixels++;
        const [sx, sy] = pixel(scl, center);
        const classification = Number(
          s[
            (Math.floor(sy) - sclBounds[1]) * sclWidth +
              Math.floor(sx) -
              sclBounds[0]
          ],
        );
        if (!VALID_SCL.has(classification)) continue;
        const i = y * width + x,
          rawG = Number(g[i]),
          rawN = Number(n[i]);
        if (rawG === greenCal.nodata || rawN === nirCal.nodata) continue;
        const b03 = rawG * greenCal.scale + greenCal.offset;
        const b08 = rawN * nirCal.scale + nirCal.offset;
        if (
          !Number.isFinite(b03) ||
          !Number.isFinite(b08) ||
          b03 < 0 ||
          b08 < 0 ||
          b03 + b08 <= 0
        )
          continue;
        sum += (b03 - b08) / (b03 + b08);
        validPixels++;
      }
    if (!validPixels)
      throw new Error(`${item.id}: sin píxeles válidos dentro del polígono`);
    return { ndwi: sum / validPixels, validPixels, totalPixels };
  } finally {
    await Promise.all(tiffs.map((t) => t.close()));
  }
}
