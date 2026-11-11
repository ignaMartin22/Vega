import { mkdirSync } from "node:fs";
import { loadWetlands } from "./wetlands.js";
import { monthlyScenes, searchScenes } from "./stac.js";
import { settings } from "./settings.js";
import { writeSceneCache } from "./cache.js";
const config = settings();
const dir = new URL("../../sample-data/stac/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const w of loadWetlands().filter(
  (w) => !config.wetlandId || w.properties.wetlandId === config.wetlandId,
)) {
  const items = await searchScenes(w, config.from, config.to, config.maxCloud);
  writeSceneCache(w.properties.wetlandId, items);
  console.log(
    `${w.properties.name}: ${items.length} escenas; ${monthlyScenes(items).length} meses`,
  );
}
