import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { writeArrayBuffer } from "geotiff";
import { PNG } from "pngjs";
import proj4 from "proj4";
import { computeMosaic, renderMosaic, acquisitions } from "../src/mosaic.js";
import {
  canonicalSurface,
  geometryHash,
  validateSurface,
} from "../src/geometry.js";
import type { StacItem } from "../src/stac.js";
import type { WetlandFeature } from "../src/wetlands.js";

test("geometría canónica conserva identidad con inicio/sentido distintos y admite agujeros/MultiPolygon", () => {
  const a = {
    type: "Polygon" as const,
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ],
  };
  const b = {
    type: "Polygon" as const,
    coordinates: [
      [
        [2, 2],
        [2, 0],
        [0, 0],
        [0, 2],
        [2, 2],
      ],
    ],
  };
  assert.equal(geometryHash(a), geometryHash(b));
  const multi = {
    type: "MultiPolygon" as const,
    coordinates: [
      a.coordinates,
      [
        [
          [3, 0],
          [4, 0],
          [4, 1],
          [3, 1],
          [3, 0],
        ],
      ],
    ],
  };
  assert.equal(validateSurface(multi).type, "MultiPolygon");
  assert.equal(canonicalSurface(multi).type, "MultiPolygon");
  assert.throws(
    () =>
      validateSurface({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [2, 0],
            [0, 2],
            [0, 0],
          ],
        ],
      }),
    /cruzada|inválida/,
  );
});

test("mosaico de teselas: no duplica el solapamiento, respeta agujeros y produce un PNG georreferenciado", async () => {
  const files: Record<string, Buffer> = {};
  const encode = (
    values: number[],
    width: number,
    height: number,
    origin: number,
    resolution: number,
    bands = 1,
    epsg = 32719,
    originY = 7200000,
  ) =>
    Buffer.from(
      writeArrayBuffer(values, {
        width,
        height,
        BitsPerSample: Array(bands).fill(8),
        ProjectedCSTypeGeoKey: epsg,
        GTModelTypeGeoKey: 1,
        ModelPixelScale: [resolution, resolution, 0],
        ModelTiepoint: [0, 0, 0, origin, originY, 0],
      }),
    );
  for (const [name, origin, g, n, color] of [
    ["a", 600000, 6, 2, [30, 200, 40]],
    ["b", 600020, 2, 6, [30, 40, 200]],
  ] as const) {
    files[`/${name}/g`] = encode(Array(16).fill(g), 4, 4, origin, 10);
    files[`/${name}/n`] = encode(Array(16).fill(n), 4, 4, origin, 10);
    files[`/${name}/s`] = encode(Array(4).fill(6), 2, 2, origin, 20);
    files[`/${name}/rgb`] = encode(
      Array.from({ length: 16 }, () => [...color]).flat(),
      4,
      4,
      origin,
      10,
      3,
    );
  }
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
        })
        .end(data.subarray(start, end + 1));
    } else res.writeHead(200, { "Content-Length": data.length }).end(data);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const items: StacItem[] = ["a", "b"].map((name) => ({
    id: name,
    properties: {
      datetime: "2024-04-01T12:00:00Z",
      platform: "sentinel-2a",
      "eo:cloud_cover": 0,
      "proj:epsg": 32719,
      "earthsearch:boa_offset_applied": true,
      "s2:datatake_id": "same-pass",
    },
    assets: Object.fromEntries(
      [
        ["green", "g"],
        ["nir", "n"],
        ["scl", "s"],
        ["visual", "rgb"],
      ].map(([key, file]) => [
        key,
        {
          href: `${url}/${name}/${file}`,
          "raster:bands": [{ scale: 0.01, offset: 0, nodata: 0 }],
        },
      ]),
    ),
  }));
  const crs = "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs";
  const inverse = (p: number[]) => proj4(crs, "EPSG:4326", p);
  const ring = [
    [600001, 7199999],
    [600059, 7199999],
    [600059, 7199961],
    [600001, 7199961],
    [600001, 7199999],
  ].map(inverse);
  const area: WetlandFeature = {
    type: "Feature",
    properties: {
      wetlandId: 1,
      name: "fixture",
      salar: "fixture",
      thresholdNdwi: 0,
    },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
  try {
    const result = await computeMosaic(items, area);
    assert.equal(result.totalPixels, 24);
    assert.equal(result.validPixels, 24);
    assert.ok(Math.abs(result.ndwi - 1 / 6) < 1e-6);
    const image = await renderMosaic(items, area),
      png = PNG.sync.read(image.png);
    assert.ok(image.coverageFraction > 0.9);
    assert.ok(png.data.some((v, i) => i % 4 === 1 && v === 200));
    assert.ok(png.data.some((v, i) => i % 4 === 2 && v === 200));
    const hole = [
      [600001, 7199979],
      [600009, 7199979],
      [600009, 7199971],
      [600001, 7199971],
      [600001, 7199979],
    ].map(inverse);
    const holed = await computeMosaic(items, {
      ...area,
      geometry: { type: "Polygon", coordinates: [ring, hole] },
    });
    assert.equal(holed.totalPixels, 23);
    assert.equal(holed.validPixels, 23);
    const parts = await computeMosaic(items, {
      ...area,
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [600001, 7199999],
              [600019, 7199999],
              [600019, 7199981],
              [600001, 7199981],
              [600001, 7199999],
            ].map(inverse),
          ],
          [
            [
              [600041, 7199979],
              [600059, 7199979],
              [600059, 7199961],
              [600041, 7199961],
              [600041, 7199979],
            ].map(inverse),
          ],
        ],
      },
    });
    assert.equal(parts.totalPixels, 8);
    assert.ok(Math.abs(parts.ndwi) < 1e-6);
    const nextCrs = "+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs";
    const [nx, ny] = proj4(crs, nextCrs, [600020, 7200000]);
    files["/c/g"] = encode(Array(16).fill(2), 4, 4, nx, 10, 1, 32720, ny);
    files["/c/n"] = encode(Array(16).fill(6), 4, 4, nx, 10, 1, 32720, ny);
    files["/c/s"] = encode(Array(4).fill(6), 2, 2, nx, 20, 1, 32720, ny);
    const across = {
      ...items[1],
      id: "c",
      properties: { ...items[1].properties, "proj:epsg": 32720 },
      assets: Object.fromEntries(
        Object.entries(items[1].assets).map(([k, v]) => [
          k,
          { ...v, href: v.href.replace("/b/", "/c/") },
        ]),
      ),
    };
    const crossZone = await computeMosaic([items[0], across], area);
    assert.equal(crossZone.validPixels, 24);
    assert.ok(Math.abs(crossZone.ndwi - 1 / 6) < 1e-6);
    assert.equal(
      acquisitions([
        ...items,
        {
          ...items[0],
          id: "later",
          properties: {
            ...items[0].properties,
            datetime: "2024-04-02T12:00:00Z",
            "s2:datatake_id": "later-pass",
          },
        },
      ]).length,
      2,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
