/** Genera un snapshot auditable desde descargas WFS IGN y USGS; sin polígonos inventados. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  area,
  booleanPointInPolygon,
  feature,
  featureCollection,
  union,
  simplify,
  truncate,
} from "@turf/turf";
import type { Surface, SurfaceFeature } from "../src/geometry.js";
import { extent, overlap, polygons } from "../src/geometry.js";
const tmp = process.env.TEMP ?? process.env.TMPDIR ?? "/tmp";
const sourceDirectory = new URL(
  "../../sample-data/catalog-sources/",
  import.meta.url,
);
const sourceBytes = (name: string) =>
  process.env.CATALOG_USE_DOWNLOADS === "1" &&
  existsSync(join(tmp, `vega-${name}.json`))
    ? readFileSync(join(tmp, `vega-${name}.json`))
    : gunzipSync(readFileSync(new URL(`${name}.json.gz`, sourceDirectory)));
const read = (name: string) => {
  const value = JSON.parse(sourceBytes(name).toString("utf8"));
  if (
    typeof value.numberMatched === "number" &&
    value.numberMatched !== value.features.length
  )
    throw new Error(`Fuente incompleta: ${name}`);
  return value;
};
const provinces = (
  read("ign-provinces-region").features as SurfaceFeature[]
).map(
  (f) =>
    simplify(f, { tolerance: 0.0001, highQuality: true }) as SurfaceFeature,
);
const salinas = read("ign-salinas").features as SurfaceFeature[];
const usgs = read("usgs-salars").features as SurfaceFeature[];
const bodies = [
  ...read("ign-areas_de_aguas_continentales_intermitente").features,
  ...read("ign-areas_de_aguas_continentales_perenne").features,
] as SurfaceFeature[];
const scope = union(featureCollection(provinces))!;
console.log(
  `Fuentes cargadas: ${salinas.length} salinas IGN, ${usgs.length} USGS, ${bodies.length} cuerpos de agua`,
);
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const boundaries = provinces.map((p) =>
  polygons(p.geometry)
    .flat()
    .flatMap((ring) =>
      ring
        .slice(1)
        .map((q, i) => [
          Math.min(q[0], ring[i][0]),
          Math.min(q[1], ring[i][1]),
          Math.max(q[0], ring[i][0]),
          Math.max(q[1], ring[i][1]),
        ]),
    ),
);
const scopeNames = (g: Surface) => {
  const box = extent(g);
  return provinces
    .filter((p, index) => {
      const boundaryNear = boundaries[index].some(
        (b) =>
          b[0] <= box[2] && b[2] >= box[0] && b[1] <= box[3] && b[3] >= box[1],
      );
      return boundaryNear
        ? overlap(g, p.geometry) > 100
        : booleanPointInPolygon(polygons(g)[0][0][0], p);
    })
    .map((p) => slug(String(p.properties!.nam)))
    .sort();
};
const selected: {
  id: string;
  name: string;
  geometry: Surface;
  provinces: string[];
  source: string;
  sourceId: string;
}[] = [];
for (const f of salinas) {
  const prov = scopeNames(f.geometry);
  if (!prov.length) continue;
  selected.push({
    id:
      f.properties!.fna === "Salar del Hombre Muerto"
        ? "hombre-muerto"
        : `ign-${f.properties!.gid}`,
    name: String(
      f.properties!.fna ?? `Salina sin nombre IGN ${f.properties!.gid}`,
    ),
    geometry: f.geometry,
    provinces: prov,
    source: "IGN edafologia_salina",
    sourceId: String(f.properties!.gid),
  });
}
// IGN divide algunos salares por hojas cartográficas. Reunir partes contiguas del mismo nombre.
for (let i = 0; i < selected.length; i++) {
  const base = selected[i];
  if (base.name.startsWith("Salina sin nombre")) continue;
  const parts = [base.geometry];
  for (let j = i + 1; j < selected.length;) {
    const candidate = selected[j];
    const touching = parts.some((g) => {
      const a = extent(g),
        b = extent(candidate.geometry);
      return (
        Math.max(0, a[0] - b[2], b[0] - a[2]) < 0.005 &&
        Math.max(0, a[1] - b[3], b[1] - a[3]) < 0.005
      );
    });
    if (candidate.name === base.name && touching) {
      parts.push(candidate.geometry);
      base.provinces = [
        ...new Set([...base.provinces, ...candidate.provinces]),
      ].sort();
      base.sourceId += "+" + candidate.sourceId;
      selected.splice(j, 1);
      j = i + 1;
    } else j++;
  }
  if (parts.length > 1)
    base.geometry = union(
      featureCollection(
        parts.map((g) =>
          truncate(feature(g), { precision: 7, coordinates: 2 }),
        ),
      ),
    )!.geometry;
}
for (const f of usgs) {
  const prov = scopeNames(f.geometry);
  if (!prov.length) continue;
  const normalized = (name: string) =>
    slug(name)
      .replace(/\b(salar|salinas?|del?|las?|los?|el)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const box = extent(f.geometry);
  if (
    selected.some((s) => {
      const b = extent(s.geometry),
        intersection =
          Math.max(0, Math.min(box[2], b[2]) - Math.max(box[0], b[0])) *
          Math.max(0, Math.min(box[3], b[3]) - Math.max(box[1], b[1]));
      const union =
        (box[2] - box[0]) * (box[3] - box[1]) +
        (b[2] - b[0]) * (b[3] - b[1]) -
        intersection;
      const aName = normalized(s.name),
        bName = normalized(String(f.properties!.Name));
      return (
        intersection > 0 &&
        (aName === bName ||
          aName.split(" o ").includes(bName) ||
          bName.split(" o ").includes(aName) ||
          intersection / union > 0.8)
      );
    })
  )
    continue;
  selected.push({
    id: `usgs-${f.properties!.OBJECTID}`,
    name: String(f.properties!.Name).trim(),
    geometry: f.geometry,
    provinces: prov,
    source: "USGS 2020 (distribución ArcGIS)",
    sourceId: String(f.properties!.OBJECTID),
  });
}
const output = new URL("../data/", import.meta.url);
mkdirSync(output, { recursive: true });
console.log(`Salares regionales: ${selected.length}`);
const salars = selected.map((s) => {
  const box = extent(s.geometry),
    dy = 15 / 111.32,
    dx = dy / Math.cos((((box[1] + box[3]) / 2) * Math.PI) / 180);
  const [w, south, e, n] = [box[0] - dx, box[1] - dy, box[2] + dx, box[3] + dy];
  const monitoringGeometry: Surface = {
    type: "Polygon",
    coordinates: [
      [
        [w, south],
        [e, south],
        [e, n],
        [w, n],
        [w, south],
      ],
    ],
  };
  return { ...s, bbox: box, boundaryValidated: true, monitoringGeometry };
});
console.log("Entornos de monitoreo construidos");
const wetlands: SurfaceFeature[] = [];
for (const f of bodies) {
  const associated = salars
    .filter((s) => overlap(f.geometry, s.monitoringGeometry) > 0)
    .map((s) => s.id);
  if (!associated.length) continue;
  if (!scopeNames(f.geometry).length) continue;
  const key = String(f.id ?? `${f.properties!.gid}-${f.properties!.objeto}`);
  const id =
    100_000 +
    Number.parseInt(
      createHash("sha256").update(key).digest("hex").slice(0, 7),
      16,
    );
  wetlands.push({
    ...f,
    properties: {
      ...f.properties,
      wetlandId: id,
      name:
        f.properties!.fna ??
        f.properties!.nam ??
        `${f.properties!.objeto ?? "Humedal"} IGN ${f.properties!.gid}`,
      salarIds: associated,
      source: "IGN cuerpos de agua perennes/intermitentes",
      sourceId: key,
      thresholdNdwi: 0,
      thresholdConfigured: false,
    },
  });
}
const files = {
  "salars.json": salars,
  "wetlands.geojson": featureCollection(wetlands),
  "region.geojson": scope,
  "provinces.geojson": featureCollection(provinces),
};
for (const [name, value] of Object.entries(files))
  writeFileSync(new URL(name, output), JSON.stringify(value) + "\n");
const sourceDir = new URL(
  "../../sample-data/catalog-sources/",
  import.meta.url,
);
mkdirSync(sourceDir, { recursive: true });
const sourceFiles = [
  "ign-provinces-region",
  "ign-salinas",
  "usgs-salars",
  "ign-areas_de_aguas_continentales_intermitente",
  "ign-areas_de_aguas_continentales_perenne",
];
const snapshots = sourceFiles.map((name) => {
  const data = sourceBytes(name);
  writeFileSync(new URL(`${name}.json.gz`, sourceDir), gzipSync(data));
  return { name, sha256: createHash("sha256").update(data).digest("hex") };
});
const manifest = {
  retrievedAt: new Date().toISOString(),
  salars: salars.length,
  wetlands: wetlands.length,
  scope: ["salta", "jujuy", "catamarca"],
  coverage:
    "Completo respecto de las capas/snapshot consultados; catálogo de cuerpos de agua, no inventario exhaustivo de humedales ecológicos. Vegas/bofedales sin polígono de agua pueden seleccionarse por dibujo.",
  monitoringBufferKm: 15,
  monitoringZoneDefinition:
    "Rectángulo envolvente ampliado aproximadamente 15 km; no cuenca hidrográfica",
  provinceSimplificationDegrees: 0.0001,
  deduplication:
    "Partes IGN contiguas del mismo nombre; prioridad IGN frente a USGS por nombre/sinónimos y solapamiento de bbox o IoU >0.8",
  sources: [
    {
      url: "https://wms.ign.gob.ar/geoserver/ows",
      layers: [
        "ign:provincia",
        "ign:edafologia_salina",
        "ign:areas_de_aguas_continentales_intermitente",
        "ign:areas_de_aguas_continentales_perenne",
      ],
    },
    {
      url: "https://services9.arcgis.com/DeJOjr4rpbUboAGS/ArcGIS/rest/services/Salares/FeatureServer/0",
      original: "https://doi.org/10.5066/P9RLUH4F",
      note: "Distribución ArcGIS; endpoint original ScienceBase rechazó descarga 403; se conserva procedencia y snapshot.",
    },
  ],
  snapshots,
};
writeFileSync(
  new URL("manifest.json", output),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      salars: salars.length,
      wetlands: wetlands.length,
      shared: salars
        .filter((s) => s.provinces.length > 1)
        .map((s) => ({ name: s.name, provinces: s.provinces })),
      byProvince: provinces.map((p) => ({
        province: p.properties!.nam,
        count: salars.filter((s) =>
          s.provinces.includes(slug(String(p.properties!.nam))),
        ).length,
      })),
    },
    null,
    2,
  ),
);
