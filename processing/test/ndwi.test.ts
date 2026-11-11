import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { writeArrayBuffer } from "geotiff";
import proj4 from "proj4";
import { computeNdwi, polygonPixelCount } from "../src/ndwi.js";
import type { StacItem } from "../src/stac.js";
import type { WetlandFeature } from "../src/wetlands.js";

test("COG: reproyecta, alinea SCL 20m, elimina nubes/nodata y promedia NDWI", async () => {
  const crs = "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs";
  const ring = [
    [600001, 7199999],
    [600039, 7199999],
    [600039, 7199961],
    [600001, 7199961],
    [600001, 7199999],
  ].map((p) => proj4(crs, "EPSG:4326", p));
  const wetland: WetlandFeature = {
    type: "Feature",
    properties: {
      wetlandId: 1,
      name: "fixture",
      salar: "fixture",
      thresholdNdwi: 1000,
    },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
  const encode = (data: number[], width: number, resolution: number) =>
    Buffer.from(
      writeArrayBuffer(data, {
        width,
        height: width,
        BitsPerSample: [8],
        ProjectedCSTypeGeoKey: 32719,
        GTModelTypeGeoKey: 1,
        ModelPixelScale: [resolution, resolution, 0],
        ModelTiepoint: [0, 0, 0, 600000, 7200000, 0],
      }),
    );
  const green = Array(16).fill(6);
  green[0] = 0;
  const files: Record<string, Buffer> = {
    "/green": encode(green, 4, 10),
    "/nir": encode(Array(16).fill(2), 4, 10),
    "/scl": encode([6, 9, 6, 6], 2, 20),
  };
  const server = createServer((req, res) => {
    const data = files[req.url!];
    if (!data) {
      res.writeHead(404).end();
      return;
    }
    const range = req.headers.range?.match(/bytes=(\d+)-(\d+)/);
    if (range) {
      const start = Number(range[1]),
        end = Math.min(Number(range[2]), data.length - 1);
      res
        .writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${data.length}`,
          "Content-Length": end - start + 1,
          "Accept-Ranges": "bytes",
        })
        .end(data.subarray(start, end + 1));
    } else res.writeHead(200, { "Content-Length": data.length }).end(data);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const asset = (name: string) => ({
    href: `${url}/${name}`,
    "raster:bands": [{ scale: 0.01, offset: 0, nodata: 0 }],
    "proj:transform": [10, 0, 600000, 0, -10, 7200000],
    "proj:shape": [4, 4],
  });
  const scene: StacItem = {
    id: "fixture",
    properties: {
      datetime: "2024-01-01T00:00:00Z",
      "eo:cloud_cover": 0,
      "proj:epsg": 32719,
      "earthsearch:boa_offset_applied": true,
    },
    assets: { green: asset("green"), nir: asset("nir"), scl: asset("scl") },
  };
  try {
    const result = await computeNdwi(scene, wetland);
    assert.equal(result.validPixels, 11);
    assert.equal(result.totalPixels, 16);
    assert.equal(polygonPixelCount(scene, wetland), 16);
    assert.ok(Math.abs(result.ndwi - 0.5) < 1e-12);
    const hole = [
      [600001, 7199979],
      [600009, 7199979],
      [600009, 7199971],
      [600001, 7199971],
      [600001, 7199979],
    ].map((p) => proj4(crs, "EPSG:4326", p));
    const withHole: WetlandFeature = {
      ...wetland,
      geometry: { type: "Polygon", coordinates: [ring, hole] },
    };
    const holed = await computeNdwi(scene, withHole);
    assert.equal(holed.totalPixels, 15);
    assert.equal(holed.validPixels, 10);
    assert.equal(polygonPixelCount(scene, withHole), 15);
    files["/scl"] = encode([9, 9, 9, 9], 2, 20);
    await assert.rejects(computeNdwi(scene, wetland), /sin píxeles válidos/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
