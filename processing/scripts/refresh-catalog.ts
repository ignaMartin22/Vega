import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const endpoint = "https://wms.ign.gob.ar/geoserver/ows";
async function request(url: URL): Promise<any> {
  let last: unknown;
  for (let i = 0; i < 3; i++)
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json();
      if (value.error || !Array.isArray(value.features))
        throw new Error("Respuesta geográfica inválida");
      return value;
    } catch (error) {
      last = error;
    }
  throw last;
}
for (const layer of [
  "provincia",
  "edafologia_salina",
  "areas_de_aguas_continentales_intermitente",
  "areas_de_aguas_continentales_perenne",
]) {
  const features: unknown[] = [];
  let start = 0,
    matched: number | undefined;
  for (;;) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      typeNames: `ign:${layer}`,
      count: "200",
      startIndex: String(start),
      ...(layer === "provincia"
        ? { CQL_FILTER: "in1 IN ('10','38','66')" }
        : { bbox: "-69,-30,-62,-21,EPSG:4326" }),
    }).toString();
    const page = await request(url);
    features.push(...page.features);
    matched =
      typeof page.numberMatched === "number" ? page.numberMatched : undefined;
    if (
      (matched !== undefined && features.length >= matched) ||
      page.features.length < 200
    )
      break;
    if (!page.features.length)
      throw new Error(`Paginación incompleta: ${layer}`);
    start += page.features.length;
  }
  if (matched !== undefined && features.length !== matched)
    throw new Error(`Fuente incompleta: ${layer}`);
  const name =
    layer === "provincia"
      ? "ign-provinces-region"
      : layer === "edafologia_salina"
        ? "ign-salinas"
        : `ign-${layer}`;
  writeFileSync(
    join(process.env.TEMP ?? process.env.TMPDIR ?? "/tmp", `vega-${name}.json`),
    JSON.stringify({
      type: "FeatureCollection",
      features,
      numberMatched: features.length,
    }),
  );
  console.log(`${name}: ${features.length}`);
}
const url = new URL(
  "https://services9.arcgis.com/DeJOjr4rpbUboAGS/ArcGIS/rest/services/Salares/FeatureServer/0/query",
);
url.search = new URLSearchParams({
  where: "1=1",
  outFields: "*",
  outSR: "4326",
  f: "geojson",
  resultRecordCount: "2000",
}).toString();
const usgs = await request(url);
if (usgs.exceededTransferLimit)
  throw new Error("USGS truncado: ampliar paginación antes de actualizar");
writeFileSync(
  join(
    process.env.TEMP ?? process.env.TMPDIR ?? "/tmp",
    "vega-usgs-salars.json",
  ),
  JSON.stringify(usgs),
);
execFileSync(
  process.execPath,
  [
    resolve(root, "node_modules/tsx/dist/cli.mjs"),
    "processing/scripts/build-catalog.ts",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CATALOG_USE_DOWNLOADS: "1" },
  },
);
