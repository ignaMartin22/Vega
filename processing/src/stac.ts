import { bbox, type WetlandFeature } from "./wetlands.js";

export const STAC_URL = "https://earth-search.aws.element84.com/v1";
export interface StacAsset {
  href: string;
  "proj:shape"?: number[];
  "proj:transform"?: number[];
  "raster:bands"?: { scale?: number; offset?: number; nodata?: number }[];
}
export interface StacItem {
  id: string;
  bbox?: number[];
  properties: {
    datetime: string;
    "eo:cloud_cover": number;
    "proj:epsg"?: number;
    "earthsearch:boa_offset_applied"?: boolean;
    "s2:processing_baseline"?: string;
    "s2:datatake_id"?: string;
    platform?: string;
  };
  assets: Record<string, StacAsset>;
}
interface Page {
  features: StacItem[];
  links?: {
    rel: string;
    href: string;
    method?: string;
    body?: Record<string, unknown>;
    merge?: boolean;
  }[];
}

/** Sigue todas las páginas STAC y deduplica por ID. */
export async function searchScenes(
  f: WetlandFeature,
  from: string,
  to: string,
  maxCloud = 20,
): Promise<StacItem[]> {
  if (
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    Date.parse(from) > Date.parse(to)
  ) {
    throw new Error("Intervalo STAC inválido");
  }
  const body = {
    collections: ["sentinel-2-l2a"],
    bbox: bbox(f),
    datetime: `${from}/${to}`,
    query: { "eo:cloud_cover": { lt: maxCloud } },
    sortby: [{ field: "properties.datetime", direction: "asc" }],
    limit: 100,
  };
  let url: string | undefined = `${STAC_URL}/search`;
  let method = "POST";
  let requestBody: unknown = body;
  const seen = new Set<string>();
  const items = new Map<string, StacItem>();
  while (url) {
    const key = `${url}:${JSON.stringify(requestBody)}`;
    if (seen.has(key)) throw new Error("STAC devolvió un ciclo de paginación");
    seen.add(key);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(requestBody) } : {}),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`STAC ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as Page;
    if (!Array.isArray(page.features))
      throw new Error("Respuesta STAC sin features");
    for (const item of page.features) {
      if (
        Number.isFinite(Date.parse(item.properties.datetime)) &&
        item.properties["eo:cloud_cover"] < maxCloud
      )
        items.set(item.id, item);
    }
    const next = page.links?.find((l) => l.rel === "next");
    url = next ? new URL(next.href, url).href : undefined;
    method = next?.method ?? "GET";
    requestBody = next?.merge ? { ...body, ...next.body } : next?.body;
  }
  return [...items.values()].sort((a, b) =>
    a.properties.datetime.localeCompare(b.properties.datetime),
  );
}

/** Menor nubosidad por mes; desempate reproducible por fecha e ID. */
export function monthlyScenes(items: StacItem[]): StacItem[] {
  const months = new Map<string, StacItem>();
  for (const item of [...items].sort(
    (a, b) =>
      a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"] ||
      a.properties.datetime.localeCompare(b.properties.datetime) ||
      a.id.localeCompare(b.id),
  )) {
    const month = item.properties.datetime.slice(0, 7);
    if (!months.has(month)) months.set(month, item);
  }
  return [...months.values()].sort((a, b) =>
    a.properties.datetime.localeCompare(b.properties.datetime),
  );
}
