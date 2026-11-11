import assert from "node:assert/strict";
import test from "node:test";
import { searchScenes, type StacItem } from "../src/stac.js";
import type { WetlandFeature } from "../src/wetlands.js";

const wetland: WetlandFeature = {
  type: "Feature",
  properties: { wetlandId: 7, name: "Humedal", salar: "Salar", thresholdNdwi: 1200 },
  geometry: { type: "Polygon", coordinates: [[[-67.1,-25.4],[-67.0,-25.4],[-67.0,-25.3],[-67.1,-25.4]]] },
};

test("searchScenes usa la geometría completa en el filtro STAC", async () => {
  const originalFetch = globalThis.fetch;
  let body: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input, init) => {
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ features: [], links: [] }), {
      status: 200, headers: { "Content-Type": "application/geo+json" },
    });
  }) as typeof fetch;
  try {
    const items: StacItem[] = await searchScenes(wetland, "2024-01-01T00:00:00Z", "2024-12-31T23:59:59Z");
    assert.deepEqual(items, []);
    assert.deepEqual(body?.intersects, wetland.geometry);
    assert.equal("bbox" in (body ?? {}), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
