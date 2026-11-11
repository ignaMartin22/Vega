import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createAnalysisServer } from "./server.js";
const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT inválido");
const directory = process.env.ANALYSIS_DATA_DIR
  ? resolve(process.env.ANALYSIS_DATA_DIR)
  : fileURLToPath(new URL("../runtime/", import.meta.url));
const origins = process.env.ALLOWED_ORIGINS?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const { server } = createAnalysisServer({
  directory,
  concurrency: Number(process.env.ANALYSIS_CONCURRENCY ?? 1),
  origins,
});
const host = process.env.HOST ?? "127.0.0.1";
server.listen(port, host, () =>
  console.log(
    `Vega I2: http://${host}:${port}; datos en ${directory}; catálogo regional IGN/USGS`,
  ),
);
