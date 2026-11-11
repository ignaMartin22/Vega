import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { AnalysisClient } from "../src/client.js";
const [id, destination] = process.argv.slice(2);
if (!id || !destination)
  throw new Error(
    "Uso: npm run export -w @vega/processing -- <analysisId> <directorio>",
  );
const base = process.env.API_URL ?? "http://127.0.0.1:8787";
const client = new AnalysisClient(base),
  state = await client.status(id);
if (["queued", "running", "failed"].includes(state.status))
  throw new Error("El trabajo debe estar terminado y tener resultados");
const result = await client.result(id),
  output = resolve(destination);
mkdirSync(join(output, "assets"), { recursive: true });
for (const frame of [...result.frames, ...(result.salarFrames ?? [])]) {
  if (!/^\d+-\d+$/.test(frame.frameId))
    throw new Error("Nombre de fotograma inválido");
  const response = await fetch(client.imageUrl(frame.imageUrl));
  if (!response.ok) throw new Error(`Imagen no disponible: ${frame.frameId}`);
  writeFileSync(
    join(output, "assets", `${frame.frameId}.png`),
    Buffer.from(await response.arrayBuffer()),
  );
  frame.imageUrl = `assets/${frame.frameId}.png`;
}
writeFileSync(
  join(output, "result.json"),
  JSON.stringify(result, null, 2) + "\n",
);
writeFileSync(
  join(output, "measurements.json"),
  JSON.stringify(result.measurements, null, 2) + "\n",
);
writeFileSync(
  join(output, "state.json"),
  JSON.stringify(state, null, 2) + "\n",
);
writeFileSync(
  join(output, "README.txt"),
  `Respaldo de análisis real ${id}.\nCalculado: ${state.updatedAt}\nPeríodo: ${result.period.from} a ${result.period.to}\nCapturas históricas; no cálculo en vivo ni publicación blockchain.\nImágenes con atribución/fecha/procedencia en result.json.\n`,
);
console.log(`Exportado a ${output}`);
