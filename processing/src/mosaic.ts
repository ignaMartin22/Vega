import { fromUrl, type GeoTIFFImage } from "geotiff";
import proj4 from "proj4";
import { PNG } from "pngjs";
import type { StacItem } from "./stac.js";
import type { WetlandFeature } from "./wetlands.js";
import { calibration, type NdwiResult } from "./ndwi.js";
import { extent, mapSurface, polygons, type Surface } from "./geometry.js";

export const utm = (epsg: number) => {
  if (!((epsg >= 32601 && epsg <= 32660) || (epsg >= 32701 && epsg <= 32760)))
    throw new Error("Se requiere UTM WGS84");
  return `+proj=utm +zone=${epsg % 100} ${epsg >= 32700 ? "+south" : ""} +datum=WGS84 +units=m +no_defs`;
};
export function acquisitions(items: StacItem[]): StacItem[][] {
  const groups = new Map<string, StacItem[]>();
  for (const item of items) {
    const key =
      item.properties["s2:datatake_id"] ??
      `${item.properties.platform ?? item.id.slice(0, 3)}:${Math.floor(Date.parse(item.properties.datetime) / 900_000)}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()]
    .filter(
      (g) =>
        new Set(g.map((s) => s.properties.platform ?? s.id.slice(0, 3)))
          .size === 1 &&
        Math.max(...g.map((s) => Date.parse(s.properties.datetime))) -
          Math.min(...g.map((s) => Date.parse(s.properties.datetime))) <=
          900_000,
    )
    .map((g) => g.sort((a, b) => a.id.localeCompare(b.id)))
    .sort(
      (a, b) =>
        Math.max(...a.map((s) => s.properties["eo:cloud_cover"])) -
          Math.max(...b.map((s) => s.properties["eo:cloud_cover"])) ||
        a[0].properties.datetime.localeCompare(b[0].properties.datetime),
    );
}
export const sourceId = (items: StacItem[]) =>
  items.length === 1
    ? items[0].id
    : `mosaic:${items
        .map((i) => i.id)
        .sort()
        .join("+")}`;
export const acquiredAt = (items: StacItem[]) =>
  new Date(
    Math.min(...items.map((i) => Date.parse(i.properties.datetime))),
  ).toISOString();
export const acquisitionEnd = (items: StacItem[]) =>
  new Date(
    Math.max(...items.map((i) => Date.parse(i.properties.datetime))),
  ).toISOString();

interface Raster {
  image: GeoTIFFImage;
  values: ArrayLike<number>;
  window: number[];
  origin: number[];
  resolution: number[];
  samples: number;
}
async function readRaster(
  item: StacItem,
  key: string,
  geographic: Surface,
  samples = 1,
  thumbnail = false,
): Promise<{ raster: Raster; close: () => Promise<boolean> }> {
  if (!item.assets[key]?.href) throw new Error(`${item.id}: falta ${key}`);
  const signal = AbortSignal.timeout(180_000);
  const tiff = await fromUrl(
    item.assets[key].href,
    { allowFullFile: false },
    signal,
  );
  try {
    // Para color se elige una overview del TIFF; el cálculo NDWI siempre usa imagen 0 nativa.
    const base = await tiff.getImage();
    let image = base;
    const projected = extent(
      mapSurface(geographic, (p) =>
        proj4("EPSG:4326", utm(item.properties["proj:epsg"]!), p),
      ),
    );
    const desiredResolution =
      Math.max(projected[2] - projected[0], projected[3] - projected[1]) / 768;
    if (thumbnail) {
      for (let i = 1; i < (await tiff.getImageCount()); i++) {
        const overview = await tiff.getImage(i);
        if (Math.abs(overview.getResolution(base)[0]) <= desiredResolution)
          image = overview;
        else break;
      }
    }
    const origin = base.getOrigin(),
      resolution = image.getResolution(base);
    if (resolution[0] <= 0 || resolution[1] >= 0)
      throw new Error("Raster rotado o no north-up");
    const window = [
      Math.max(0, Math.floor((projected[0] - origin[0]) / resolution[0])),
      Math.max(0, Math.floor((projected[3] - origin[1]) / resolution[1])),
      Math.min(
        image.getWidth(),
        Math.ceil((projected[2] - origin[0]) / resolution[0]),
      ),
      Math.min(
        image.getHeight(),
        Math.ceil((projected[1] - origin[1]) / resolution[1]),
      ),
    ];
    let values: ArrayLike<number> = [];
    if (window[2] > window[0] && window[3] > window[1]) {
      if ((window[2] - window[0]) * (window[3] - window[1]) > 25_000_000)
        throw new Error("Ventana demasiado grande; dividir el área");
      values = (await image.readRasters({
        window,
        samples: Array.from({ length: samples }, (_, i) => i),
        interleave: true,
        signal,
      })) as unknown as ArrayLike<number>;
    }
    return {
      raster: { image, values, window, origin, resolution, samples },
      close: () => tiff.close(),
    };
  } catch (error) {
    await tiff.close();
    throw error;
  }
}
function sample(r: Raster, [x, y]: number[], band = 0): number | undefined {
  const col = Math.floor((x - r.origin[0]) / r.resolution[0]),
    row = Math.floor((y - r.origin[1]) / r.resolution[1]);
  if (
    col < r.window[0] ||
    col >= r.window[2] ||
    row < r.window[1] ||
    row >= r.window[3]
  )
    return undefined;
  return Number(
    r.values[
      ((row - r.window[1]) * (r.window[2] - r.window[0]) + col - r.window[0]) *
        r.samples +
        band
    ],
  );
}

/** Grilla de destino única: cada centro de píxel contribuye una sola vez, incluso en solapamientos. */
export async function computeMosaic(
  items: StacItem[],
  area: WetlandFeature,
): Promise<NdwiResult> {
  if (!items.length) throw new Error("Adquisición vacía");
  if (area.geometry.type === "MultiPolygon") {
    let weighted = 0,
      validPixels = 0,
      totalPixels = 0;
    for (const coordinates of area.geometry.coordinates) {
      const part = await computeMosaic(items, {
        ...area,
        geometry: { type: "Polygon", coordinates },
      });
      weighted += part.ndwi * part.validPixels;
      validPixels += part.validPixels;
      totalPixels += part.totalPixels;
    }
    return { ndwi: weighted / validPixels, validPixels, totalPixels };
  }
  const bounds = extent(area.geometry),
    center = (bounds[0] + bounds[2]) / 2;
  const target = utm(32700 + Math.floor((center + 180) / 6) + 1);
  const projected = mapSurface(area.geometry, (p) =>
    proj4("EPSG:4326", target, p),
  );
  const box = extent(projected),
    left = Math.floor(box[0] / 10) * 10,
    top = Math.ceil(box[3] / 10) * 10;
  const width = Math.ceil((box[2] - left) / 10),
    height = Math.ceil((top - box[1]) / 10),
    size = width * height;
  if (size > 25_000_000)
    throw new Error(
      "Área superior al límite de 25 millones de píxeles; dividir el humedal",
    );
  const values = new Float32Array(size),
    valid = new Uint8Array(size),
    inside = new Uint8Array(size);
  // Barrido por filas: evita comprobar miles de segmentos para cada píxel.
  for (const polygon of polygons(projected))
    for (let y = 0; y < height; y++) {
      const py = top - (y + 0.5) * 10,
        crossings: number[] = [];
      for (const ring of polygon)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [x1, y1] = ring[i],
            [x2, y2] = ring[j];
          if (y1 > py !== y2 > py)
            crossings.push(x1 + ((x2 - x1) * (py - y1)) / (y2 - y1));
        }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const start = Math.max(0, Math.ceil((crossings[i] - left) / 10 - 0.5)),
          end = Math.min(
            width,
            Math.ceil((crossings[i + 1] - left) / 10 - 0.5),
          );
        if (end > start) inside.fill(1, y * width + start, y * width + end);
      }
    }
  let totalPixels = 0;
  for (const pixel of inside) totalPixels += pixel;
  if (!totalPixels) throw new Error("Área sin centros de píxel");
  let remaining = totalPixels;
  const inverse = proj4(target, "EPSG:4326");
  for (const item of items) {
    if (!remaining) break;
    if (
      item.bbox &&
      (item.bbox[0] > bounds[2] ||
        item.bbox[2] < bounds[0] ||
        item.bbox[1] > bounds[3] ||
        item.bbox[3] < bounds[1])
    )
      continue;
    const handles: Awaited<ReturnType<typeof readRaster>>[] = [];
    try {
      const opened = await Promise.allSettled(
        ["green", "nir", "scl"].map((key) =>
          readRaster(item, key, area.geometry),
        ),
      );
      for (const entry of opened)
        if (entry.status === "fulfilled") handles.push(entry.value);
      const failure = opened.find((entry) => entry.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      const [g, n, s] = handles.map((h) => h.raster);
      if (!g.values.length) continue;
      const gc = calibration(item, item.assets.green),
        nc = calibration(item, item.assets.nir);
      if (
        g.origin.slice(0, 2).some((v, i) => v !== n.origin[i]) ||
        g.resolution.slice(0, 2).some((v, i) => v !== n.resolution[i])
      )
        throw new Error("B03 y B08 no alineadas");
      const tile = utm(item.properties["proj:epsg"]!),
        toTile = tile === target ? undefined : proj4("EPSG:4326", tile);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          if (!inside[index] || valid[index]) continue;
          const point = [left + (x + 0.5) * 10, top - (y + 0.5) * 10];
          const xy = toTile ? toTile.forward(inverse.forward(point)) : point;
          const scl = sample(s, xy),
            rawG = sample(g, xy),
            rawN = sample(n, xy);
          if (
            scl === undefined ||
            ![2, 4, 5, 6, 7].includes(scl) ||
            rawG === undefined ||
            rawN === undefined ||
            rawG === gc.nodata ||
            rawN === nc.nodata
          )
            continue;
          const b03 = rawG * gc.scale + gc.offset,
            b08 = rawN * nc.scale + nc.offset;
          if (
            !Number.isFinite(b03) ||
            !Number.isFinite(b08) ||
            b03 < 0 ||
            b08 < 0 ||
            b03 + b08 <= 0
          )
            continue;
          valid[index] = 1;
          values[index] = (b03 - b08) / (b03 + b08);
          remaining--;
        }
    } finally {
      await Promise.all(handles.map((h) => h.close()));
    }
  }
  let sum = 0,
    validPixels = 0;
  for (let i = 0; i < size; i++)
    if (valid[i]) {
      sum += values[i];
      validPixels++;
    }
  return {
    ndwi: validPixels ? sum / validPixels : 0,
    validPixels,
    totalPixels,
  };
}

/** Mosaico de la misma adquisición, en EPSG:4326; nodata/partes sin cobertura son transparentes. */
export async function renderMosaic(
  items: StacItem[],
  area: WetlandFeature,
): Promise<{
  png: Buffer;
  bbox: [number, number, number, number];
  coverageFraction: number;
}> {
  const box = extent(area.geometry),
    [west, south, east, north] = box;
  const ratio =
    (north - south) /
    ((east - west) * Math.cos((((north + south) / 2) * Math.PI) / 180));
  const width = ratio > 1 ? Math.max(32, Math.round(768 / ratio)) : 768,
    height = ratio > 1 ? 768 : Math.max(32, Math.round(768 * ratio));
  const png = new PNG({ width, height });
  const geographic: Surface = {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
  let filled = 0;
  for (const item of items) {
    const handle = await readRaster(item, "visual", geographic, 3, true);
    try {
      const transform = proj4("EPSG:4326", utm(item.properties["proj:epsg"]!));
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          if (png.data[index + 3]) continue;
          const xy = transform.forward([
            west + ((x + 0.5) * (east - west)) / width,
            north - ((y + 0.5) * (north - south)) / height,
          ]);
          const r = sample(handle.raster, xy, 0),
            g = sample(handle.raster, xy, 1),
            b = sample(handle.raster, xy, 2);
          if (
            r === undefined ||
            g === undefined ||
            b === undefined ||
            (r === 0 && g === 0 && b === 0)
          )
            continue;
          png.data[index] = r;
          png.data[index + 1] = g;
          png.data[index + 2] = b;
          png.data[index + 3] = 255;
          filled++;
        }
    } finally {
      await handle.close();
    }
  }
  if (!filled) throw new Error("Sin cobertura visual");
  return {
    png: PNG.sync.write(png),
    bbox: box,
    coverageFraction: filled / (width * height),
  };
}
