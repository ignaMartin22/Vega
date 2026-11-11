import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  NDWI_METHOD,
  NDWI_MOSAIC_METHOD,
  RECORD_SCHEMA,
  toScaled,
  withHash,
  type HashedMeasurement,
} from "@vega/shared";
import { findSalar, type AnalysisRequest } from "./catalog.js";
import { computeNdwi } from "./ndwi.js";
import { searchScenes, type StacItem } from "./stac.js";
import { renderFrame } from "./frame.js";
import {
  acquisitions,
  acquiredAt,
  acquisitionEnd,
  sourceId,
  computeMosaic,
  renderMosaic,
} from "./mosaic.js";
import { extent } from "./geometry.js";
import type { WetlandFeature } from "./wetlands.js";
export interface Progress {
  phase: string;
  completed: number;
  total: number;
}
export interface EvolutionFrame {
  frameId: string;
  wetlandId: number;
  scope: "area" | "salar";
  capturedAt: string;
  captureEnd?: string;
  sceneIds: string[];
  imageUrl: string;
  bbox: [number, number, number, number];
  crs: "EPSG:4326";
  measurementHashes: string[];
  coverageFraction: number;
  renderPolicy: string;
  attribution: string;
}
export interface AnalysisResult {
  period: AnalysisRequest["period"];
  measurements: HashedMeasurement[];
  frames: EvolutionFrame[];
  salarFrames?: EvolutionFrame[];
  issues: {
    wetlandId: number;
    window: number;
    code: string;
    message: string;
  }[];
  provenance: {
    dataHash: string;
    geometryHash: string;
    sceneId: string;
    sceneIds?: string[];
    validFraction: number;
    totalPixels: number;
    method?: string;
    assets?: unknown;
  }[];
  publication: { status: "not_requested"; reviewRequired: boolean };
  areas: AnalysisRequest["areas"];
}
export interface AnalysisContext {
  id: string;
  directory: string;
  progress: (value: Progress) => void;
}
export type AnalysisRunner = (
  request: AnalysisRequest,
  context: AnalysisContext,
) => Promise<AnalysisResult>;
interface Dependencies {
  search: typeof searchScenes;
  compute: typeof computeNdwi;
  render: typeof renderFrame;
  computeGroup?: typeof computeMosaic;
  renderGroup?: typeof renderMosaic;
}
const defaults: Dependencies = {
  search: searchScenes,
  compute: computeNdwi,
  render: renderFrame,
  computeGroup: computeMosaic,
  renderGroup: renderMosaic,
};
export async function analyze(
  request: AnalysisRequest,
  context: AnalysisContext,
  deps: Dependencies = defaults,
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    period: request.period,
    measurements: [],
    frames: [],
    salarFrames: [],
    issues: [],
    provenance: [],
    publication: { status: "not_requested", reviewRequired: true },
    areas: request.areas,
  };
  const selected = request.salar ?? findSalar(request.salarId);
  const total =
    (request.areas.length +
      (selected && selected.boundaryKind !== "user_selection" ? 1 : 0)) *
    request.windows.length;
  let completed = 0;
  if (selected?.boundaryKind === "user_selection")
    result.issues.push({
      wetlandId: 0,
      window: -1,
      code: "salar_boundary_missing",
      message:
        "Solo se aportaron humedales; se generan imágenes por área. Para la secuencia del salar completo elegí su ID de catálogo o aportá salarGeometry.",
    });
  const full: WetlandFeature | undefined =
    selected && selected.boundaryKind !== "user_selection"
      ? {
          type: "Feature",
          properties: {
            wetlandId: 0,
            name: selected.name,
            salar: selected.name,
            thresholdNdwi: 0,
          },
          geometry: selected.geometry,
        }
      : undefined;
  const bounds = [
    ...(full ? [extent(full.geometry)] : []),
    ...request.areas.map((a) => extent(a.feature.geometry)),
  ];
  const [west, south, east, north] = [
    Math.min(...bounds.map((b) => b[0])),
    Math.min(...bounds.map((b) => b[1])),
    Math.max(...bounds.map((b) => b[2])),
    Math.max(...bounds.map((b) => b[3])),
  ];
  const query: WetlandFeature = {
    type: "Feature",
    properties: request.areas[0].feature.properties,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
  context.progress({ phase: "searching", completed, total });
  let scenes: StacItem[];
  try {
    scenes = await deps.search(
      query,
      request.period.from,
      request.period.to,
      20,
    );
  } catch (error) {
    result.issues.push({
      wetlandId: 0,
      window: -1,
      code: "search_failed",
      message: String(error),
    });
    return result;
  }
  writeFileSync(
    join(context.directory, "scenes.json"),
    JSON.stringify(scenes) + "\n",
  );
  const groups = acquisitions(scenes);
  const calculate =
    deps.computeGroup ??
    (async (items: StacItem[], area: WetlandFeature) =>
      deps.compute(items[0], area));
  const render =
    deps.renderGroup ??
    (async (items: StacItem[], area: WetlandFeature) => ({
      ...(await deps.render(items[0], area)),
      coverageFraction: 1,
    }));
  for (const window of request.windows) {
    const candidates = groups.filter(
      (g) =>
        Date.parse(acquiredAt(g)) >= Date.parse(window.from) &&
        Date.parse(acquisitionEnd(g)) < Date.parse(window.to),
    );
    for (const area of request.areas) {
      const id = area.feature.properties.wetlandId;
      let accepted = false,
        lastError: string | undefined;
      context.progress({ phase: "computing", completed, total });
      for (const group of candidates) {
        try {
          const stats = await retry(() => calculate(group, area.feature)),
            fraction = stats.validPixels / stats.totalPixels;
          if (
            !Number.isFinite(stats.ndwi) ||
            Math.abs(stats.ndwi) > 1 ||
            !Number.isFinite(fraction) ||
            fraction < 0.5 ||
            fraction > 1
          )
            continue;
          const method = deps.computeGroup
            ? (`${NDWI_MOSAIC_METHOD};geometry-sha256=${area.geometryHash}` as const)
            : NDWI_METHOD;
          const record = withHash({
            schema: RECORD_SCHEMA,
            wetlandId: id,
            ndwi: toScaled(stats.ndwi),
            sceneId: sourceId(group),
            timestamp: Math.floor(Date.parse(acquiredAt(group)) / 1000),
            cloudCover: Math.max(
              ...group.map((s) => s.properties["eo:cloud_cover"]),
            ),
            validPixels: stats.validPixels,
            method,
          });
          result.measurements.push(record);
          result.provenance.push({
            dataHash: record.dataHash,
            geometryHash: area.geometryHash,
            sceneId: record.sceneId,
            sceneIds: group.map((s) => s.id),
            validFraction: fraction,
            totalPixels: stats.totalPixels,
            method,
            assets: group.map((s) => ({
              sceneId: s.id,
              properties: s.properties,
              assets: s.assets,
            })),
          });
          accepted = true;
          try {
            const image = await retry(() => render(group, area.feature));
            result.frames.push(
              saveFrame(
                image,
                group,
                id,
                "area",
                window.index,
                [record.dataHash],
                context,
              ),
            );
          } catch (error) {
            result.issues.push({
              wetlandId: id,
              window: window.index,
              code: "frame_failed",
              message: String(error),
            });
          }
          break;
        } catch (error) {
          lastError = String(error);
        }
      }
      if (!accepted)
        result.issues.push({
          wetlandId: id,
          window: window.index,
          code: lastError ? "processing_failed" : "insufficient_data",
          message:
            lastError ?? "Sin adquisición con al menos 50% de píxeles válidos",
        });
      completed++;
      context.progress({ phase: "computing", completed, total });
    }
    if (full) {
      context.progress({ phase: "rendering_salar", completed, total });
      let accepted = false,
        lastError: string | undefined;
      for (const group of candidates) {
        try {
          const image = await retry(() => render(group, full));
          if (image.coverageFraction < 0.9) continue;
          const ids = new Set(group.map((s) => s.id));
          const hashes = result.provenance
            .filter((p) => p.sceneIds?.every((id) => ids.has(id)))
            .map((p) => p.dataHash);
          result.salarFrames!.push(
            saveFrame(image, group, 0, "salar", window.index, hashes, context),
          );
          accepted = true;
          break;
        } catch (error) {
          lastError = String(error);
        }
      }
      if (!accepted)
        result.issues.push({
          wetlandId: 0,
          window: window.index,
          code: lastError ? "frame_failed" : "insufficient_visual_coverage",
          message:
            lastError ??
            "Sin adquisición que cubra al menos 90% del encuadre del salar",
        });
      completed++;
      context.progress({ phase: "rendering_salar", completed, total });
    }
  }
  result.measurements.sort(
    (a, b) => a.wetlandId - b.wetlandId || a.timestamp - b.timestamp,
  );
  result.frames.sort(
    (a, b) =>
      a.capturedAt.localeCompare(b.capturedAt) || a.wetlandId - b.wetlandId,
  );
  context.progress({ phase: "complete", completed, total });
  return result;
}
function saveFrame(
  image: {
    png: Buffer;
    bbox: [number, number, number, number];
    coverageFraction: number;
  },
  group: StacItem[],
  id: number,
  scope: "area" | "salar",
  index: number,
  hashes: string[],
  context: AnalysisContext,
): EvolutionFrame {
  const frameId = `${id}-${index}`;
  writeFileSync(join(context.directory, `${frameId}.png`), image.png);
  return {
    frameId,
    wetlandId: id,
    scope,
    capturedAt: acquiredAt(group),
    captureEnd: acquisitionEnd(group),
    sceneIds: group.map((s) => s.id),
    imageUrl: `/api/analyses/${context.id}/assets/${frameId}.png`,
    bbox: image.bbox,
    crs: "EPSG:4326",
    measurementHashes: hashes,
    coverageFraction: image.coverageFraction,
    renderPolicy:
      "Sentinel-2 TCI, sin ajustes variables por fecha; huecos transparentes",
    attribution: `Contains modified Copernicus Sentinel data ${acquiredAt(group).slice(0, 4)}, processed by Vega.`,
  };
}
async function retry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!/request|fetch|network|abort|timeout/i.test(String(error)))
      throw error;
    return operation();
  }
}
