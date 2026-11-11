/**
 * Pipeline: humedales -> escenas STAC -> NDWI -> MeasurementRecord + dataHash
 * Salida: sample-data/measurements.json (mismo formato que measurements.mock.json)
 * Responsable: Integrante 2 (Datos).
 */
import { writeFileSync } from "node:fs";
import { NDWI_METHOD, RECORD_SCHEMA, toScaled, withHash, type HashedMeasurement } from "@vega/shared";
import { loadWetlands } from "./wetlands.js";
import { searchScenes, selectBestScenePerMonth } from "./stac.js";
import { computeNdwi } from "./ndwi.js";

const FROM = "2023-01-01T00:00:00Z";
const TO = new Date().toISOString();

const out: HashedMeasurement[] = [];
for (const w of loadWetlands()) {
  const scenes = await searchScenes(w, FROM, TO);
  const items = selectBestScenePerMonth(scenes);
  console.log(`${w.properties.name}: ${scenes.length} escenas encontradas, ${items.length} seleccionadas (una por mes)`);

  for (const item of items) {
    const { ndwi, validPixels } = await computeNdwi(item, w);
    out.push(
      withHash({
        schema: RECORD_SCHEMA,
        wetlandId: w.properties.wetlandId,
        ndwi: toScaled(ndwi),
        sceneId: item.id,
        timestamp: Math.floor(Date.parse(item.properties.datetime) / 1000),
        cloudCover: item.properties["eo:cloud_cover"],
        validPixels,
        method: NDWI_METHOD,
      }),
    );
  }
}
writeFileSync(new URL("../../sample-data/measurements.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`OK: ${out.length} mediciones -> sample-data/measurements.json`);
