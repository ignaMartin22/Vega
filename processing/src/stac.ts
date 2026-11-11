/**
 * Búsqueda de escenas Sentinel-2 L2A en Earth Search (sin API key).
 * Responsable: Integrante 2 (Datos).
 */
import { bbox, type WetlandFeature } from "./wetlands.js";

export const STAC_URL = "https://earth-search.aws.element84.com/v1";

export interface StacItem {
  id: string;
  properties: { datetime: string; "eo:cloud_cover": number; "proj:epsg"?: number };
  assets: Record<string, { href: string }>; // usar assets.green (B03), assets.nir (B08), assets.scl
}

interface StacLink {
  rel: string;
  href: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface StacPage {
  features?: StacItem[];
  links?: StacLink[];
}

const SEARCH_LIMIT = 100;
const MAX_PAGES = 1_000;

export async function searchScenes(f: WetlandFeature, from: string, to: string, maxCloud = 20): Promise<StacItem[]> {
  const searchBody = {
    collections: ["sentinel-2-l2a"],
    bbox: bbox(f),
    datetime: `${from}/${to}`,
    query: { "eo:cloud_cover": { lt: maxCloud } },
    sortby: [{ field: "properties.datetime", direction: "asc" }],
    limit: SEARCH_LIMIT,
  };

  let next: StacLink = {
    rel: "search",
    href: `${STAC_URL}/search`,
    method: "POST",
    body: searchBody,
  };
  const visited = new Set<string>();
  const items: StacItem[] = [];

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const method = next.method ?? "GET";
    const requestKey = `${method} ${next.href} ${JSON.stringify(next.body ?? null)}`;
    if (visited.has(requestKey)) throw new Error(`STAC devolvió un enlace de paginación repetido: ${next.href}`);
    visited.add(requestKey);

    const response = await fetch(next.href, {
      method,
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        ...next.headers,
      },
      ...(method === "POST" ? { body: JSON.stringify(next.body ?? searchBody) } : {}),
    });
    if (!response.ok) throw new Error(`STAC ${response.status}: ${await response.text()}`);

    const page = (await response.json()) as StacPage;
    if (!Array.isArray(page.features)) throw new Error("Respuesta STAC inválida: falta el array features");
    items.push(...page.features);

    const nextLink = page.links?.find((link) => link.rel === "next");
    if (!nextLink) return items;
    next = nextLink;
  }

  throw new Error(`STAC superó el límite de seguridad de ${MAX_PAGES} páginas`);
}

/** Devuelve la escena menos nubosa de cada mes UTC, en orden cronológico. */
export function selectBestScenePerMonth(items: StacItem[]): StacItem[] {
  const bestByMonth = new Map<string, StacItem>();

  for (const item of items) {
    const timestamp = Date.parse(item.properties.datetime);
    const cloudCover = item.properties["eo:cloud_cover"];
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Fecha STAC inválida para la escena ${item.id}: ${item.properties.datetime}`);
    }
    if (!Number.isFinite(cloudCover) || cloudCover < 0 || cloudCover > 100) {
      throw new Error(`eo:cloud_cover inválido para la escena ${item.id}: ${cloudCover}`);
    }

    const month = new Date(timestamp).toISOString().slice(0, 7);
    const current = bestByMonth.get(month);
    if (!current) {
      bestByMonth.set(month, item);
      continue;
    }

    const currentCloudCover = current.properties["eo:cloud_cover"];
    const currentTimestamp = Date.parse(current.properties.datetime);
    if (
      cloudCover < currentCloudCover ||
      (cloudCover === currentCloudCover && timestamp < currentTimestamp) ||
      (cloudCover === currentCloudCover && timestamp === currentTimestamp && item.id.localeCompare(current.id) < 0)
    ) {
      bestByMonth.set(month, item);
    }
  }

  return [...bestByMonth.values()].sort((a, b) => {
    const timeDifference = Date.parse(a.properties.datetime) - Date.parse(b.properties.datetime);
    return timeDifference || a.id.localeCompare(b.id);
  });
}
