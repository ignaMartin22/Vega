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

export async function searchScenes(f: WetlandFeature, from: string, to: string, maxCloud = 20): Promise<StacItem[]> {
  const res = await fetch(`${STAC_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      // intersects usa la geometría completa: evita escenas que solo tocan el bbox
      // pero no cubren el humedal.
      intersects: f.geometry,
      datetime: `${from}/${to}`,
      query: { "eo:cloud_cover": { lt: maxCloud } },
      sortby: [{ field: "properties.datetime", direction: "asc" }],
      limit: 100,
    }),
  });
  if (!res.ok) throw new Error(`STAC ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json || !Array.isArray(json.features)) {
    throw new Error("Respuesta STAC inválida: falta el array features");
  }
  return json.features;
}
