/**
 * Prueba rápida de STAC: guarda la respuesta cruda en sample-data/stac/ (plan B offline).
 *   npm run search -w @vega/processing
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { loadWetlands } from "./wetlands.js";
import { searchScenes } from "./stac.js";

const dir = new URL("../../sample-data/stac/", import.meta.url);
mkdirSync(dir, { recursive: true });

for (const w of loadWetlands()) {
  const items = await searchScenes(w, "2024-01-01T00:00:00Z", "2024-12-31T23:59:59Z");
  writeFileSync(new URL(`wetland-${w.properties.wetlandId}-2024.json`, dir), JSON.stringify(items, null, 2));
  console.log(`${w.properties.name}: ${items.length} escenas`);
}
