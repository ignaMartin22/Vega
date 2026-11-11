import assert from "node:assert/strict";
import test from "node:test";
import { searchScenes, STAC_URL } from "./stac.js";
import type { WetlandFeature } from "./wetlands.js";

const wetland: WetlandFeature = {
  type: "Feature",
  properties: { wetlandId: 7, name: "Humedal", salar: "Salar", thresholdNdwi: 1200 },
  geometry: {
    type: "Polygon",
    coordinates: [[[-67.1, -25.4], [-67.0, -25.4], [-67.0, -25.3], [-67.1, -25.3], [-67.1, -25.4]]],
  },
};

test("searchScenes envía la geometría completa como intersects", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ features: [] }), {
      status: 200,
      headers: { "Content-Type": "application/geo+json" },
    });
  }) as typeof fetch;

  try {
    const scenes = await searchScenes(wetland, "2024-01-01T00:00:00Z", "2024-12-31T23:59:59Z");
    assert.deepEqual(scenes, []);
    assert.equal(requestBody?.collections instanceof Array, true);
    assert.deepEqual(requestBody?.intersects, wetland.geometry);
    assert.equal("bbox" in (requestBody ?? {}), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searchScenes informa respuestas STAC mal formadas", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ items: [] }), { status: 200 })) as typeof fetch;
  try {
    await assert.rejects(
      searchScenes(wetland, "2024-01-01T00:00:00Z", "2024-12-31T23:59:59Z"),
      /falta el array features/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
