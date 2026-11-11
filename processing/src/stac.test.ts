import assert from "node:assert/strict";
import test from "node:test";
import { searchScenes, selectBestScenePerMonth, STAC_URL, type StacItem } from "./stac.js";
import type { WetlandFeature } from "./wetlands.js";

const wetland: WetlandFeature = {
  type: "Feature",
  properties: { wetlandId: 1, name: "Test", salar: "Test salar", thresholdNdwi: 1500 },
  geometry: {
    type: "Polygon",
    coordinates: [[[-67.1, -25.4], [-67.0, -25.4], [-67.0, -25.3], [-67.1, -25.3], [-67.1, -25.4]]],
  },
};

function scene(id: string, datetime: string, cloudCover: number): StacItem {
  return {
    id,
    properties: { datetime, "eo:cloud_cover": cloudCover },
    assets: {},
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/geo+json" },
  });
}

test("selectBestScenePerMonth keeps the clearest scene and returns chronological order", () => {
  const selected = selectBestScenePerMonth([
    scene("feb-cloudy", "2024-02-12T10:00:00Z", 18),
    scene("jan-later", "2024-01-20T10:00:00Z", 5),
    scene("feb-clear", "2024-02-08T10:00:00Z", 3),
    scene("jan-clear-later", "2024-01-25T10:00:00Z", 2),
    scene("jan-clear-earlier", "2024-01-05T10:00:00Z", 2),
  ]);

  assert.deepEqual(selected.map((item) => item.id), ["jan-clear-earlier", "feb-clear"]);
});

test("selectBestScenePerMonth rejects invalid dates and cloud cover values", () => {
  assert.throws(
    () => selectBestScenePerMonth([scene("bad-date", "not-a-date", 5)]),
    /Fecha STAC inválida/,
  );
  assert.throws(
    () => selectBestScenePerMonth([scene("bad-cloud", "2024-01-01T00:00:00Z", 101)]),
    /eo:cloud_cover inválido/,
  );
});

test("searchScenes follows STAC POST and GET pagination links", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; body?: string }> = [];

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ url, method, body: typeof init?.body === "string" ? init.body : undefined });

    if (requests.length === 1) {
      return jsonResponse({
        features: [scene("page-1", "2024-01-01T00:00:00Z", 4)],
        links: [{
          rel: "next",
          href: `${STAC_URL}/search?page=2`,
          method: "POST",
          body: { token: "page-2" },
        }],
      });
    }
    if (requests.length === 2) {
      return jsonResponse({
        features: [scene("page-2", "2024-02-01T00:00:00Z", 6)],
        links: [{ rel: "next", href: `${STAC_URL}/search?page=3`, method: "GET" }],
      });
    }
    return jsonResponse({ features: [scene("page-3", "2024-03-01T00:00:00Z", 8)], links: [] });
  }) as typeof fetch;

  try {
    const items = await searchScenes(wetland, "2024-01-01T00:00:00Z", "2024-03-31T23:59:59Z");
    assert.deepEqual(items.map((item) => item.id), ["page-1", "page-2", "page-3"]);
    assert.equal(requests.length, 3);
    assert.equal(requests[0].url, `${STAC_URL}/search`);
    assert.equal(requests[0].method, "POST");
    assert.equal(JSON.parse(requests[1].body ?? "{}").token, "page-2");
    assert.equal(requests[2].method, "GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
