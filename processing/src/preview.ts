/** PNG de color real Sentinel-2 con AOIs: inspección visual reproducible. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fromUrl } from "geotiff";
import proj4 from "proj4";
import { PNG } from "pngjs";
import { loadWetlands } from "./wetlands.js";
import type { StacItem } from "./stac.js";
const item: StacItem = JSON.parse(readFileSync(new URL("../../sample-data/stac/reference-scene.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const crs = `+proj=utm +zone=${item.properties["proj:epsg"]! % 100} +south +datum=WGS84 +units=m +no_defs`;
const wetlands = loadWetlands();
const rings = wetlands.map((w) => w.geometry.coordinates[0].map((p) => proj4("EPSG:4326", crs, p)));
const points = rings.flat();
const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
const bbox = [Math.min(...xs) - 1500, Math.min(...ys) - 1500, Math.max(...xs) + 1500, Math.max(...ys) + 1500];
const width = 1000, height = Math.round(width * (bbox[3] - bbox[1]) / (bbox[2] - bbox[0]));
const signal = AbortSignal.timeout(180_000);
const tiff = await fromUrl(item.assets.visual.href, { allowFullFile: false }, signal);
try {
  const rgb = await tiff.readRasters({ bbox, width, height, samples: [0,1,2], interleave: true, resampleMethod: "nearest", signal });
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = Number(rgb[i * 3]); png.data[i * 4 + 1] = Number(rgb[i * 3 + 1]); png.data[i * 4 + 2] = Number(rgb[i * 3 + 2]); png.data[i * 4 + 3] = 255;
  }
  const colors = [[255,80,80],[40,220,255],[255,240,0]];
  rings.forEach((ring, index) => {
    const pixels = ring.map(([x,y]) => [(x - bbox[0]) / (bbox[2] - bbox[0]) * width, (bbox[3] - y) / (bbox[3] - bbox[1]) * height]);
    for (let i = 1; i < pixels.length; i++) {
      const [x0,y0] = pixels[i - 1], [x1,y1] = pixels[i];
      const steps = Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));
      for (let s = 0; s <= steps; s++) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const x = Math.round(x0 + (x1-x0)*s/steps) + dx, y = Math.round(y0 + (y1-y0)*s/steps) + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const k = (y * width + x) * 4;
        png.data[k] = colors[index][0]; png.data[k+1] = colors[index][1]; png.data[k+2] = colors[index][2];
      }
    }
  });
  const dir = new URL("../../sample-data/validation/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL("sentinel-aois.png", dir), PNG.sync.write(png));
  writeFileSync(new URL("sentinel-aois.json", dir), JSON.stringify({ sceneId: item.id, bbox, epsg: item.properties["proj:epsg"], colors: { "1": "rojo", "2": "cian", "3": "amarillo" }, attribution: "Contains modified Copernicus Sentinel data 2024, processed by Vega." }, null, 2) + "\n");
  console.log("OK: sample-data/validation/sentinel-aois.png");
} finally { await tiff.close(); }
