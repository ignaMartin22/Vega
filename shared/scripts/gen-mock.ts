/**
 * Genera sample-data/measurements.mock.json: serie mensual falsa pero con el
 * formato y hash EXACTOS del contrato de datos. Permite que relayer y frontend
 * trabajen antes de tener datos reales.  Uso: npm run mock (desde la raíz)
 */
import { writeFileSync } from "node:fs";
import { NDWI_METHOD, RECORD_SCHEMA, withHash, type HashedMeasurement } from "../src/index.js";

const out: HashedMeasurement[] = [];
const wetlands = [
  { id: 1, base: 0.32 },
  { id: 2, base: 0.18 },
  { id: 3, base: 0.25 },
];
const start = Date.UTC(2023, 0, 15);
for (const w of wetlands) {
  for (let m = 0; m < 34; m++) {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + m);
    const seasonal = 0.06 * Math.sin((m / 12) * 2 * Math.PI);
    const trend = w.id === 2 ? -0.004 * m : -0.001 * m; // el humedal 2 se seca -> WaterAlert
    const ndwi = Math.round((w.base + seasonal + trend) * 10_000);
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
    out.push(withHash({
      schema: RECORD_SCHEMA,
      wetlandId: w.id,
      ndwi,
      sceneId: `MOCK_S2A_19KFA_${ymd}_0_L2A`,
      timestamp: Math.floor(d.getTime() / 1000),
      cloudCover: (m * 7) % 19,
      validPixels: 1200 + w.id * 100,
      method: NDWI_METHOD,
    }));
  }
}
const path = new URL("../../sample-data/measurements.mock.json", import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
console.log(`OK: ${out.length} mediciones mock -> sample-data/measurements.mock.json`);
