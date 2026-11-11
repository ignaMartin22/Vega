import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import type { StacItem } from "./stac.js";

const directory = new URL("../../sample-data/stac/", import.meta.url);
export function writeSceneCache(id: number, items: StacItem[]): void {
  writeFileSync(new URL(`wetland-${id}.json.gz`, directory), gzipSync(JSON.stringify(items), { level: 9 }));
}
export function readSceneCache(id: number): StacItem[] {
  const compressed = new URL(`wetland-${id}.json.gz`, directory);
  if (existsSync(compressed)) return JSON.parse(gunzipSync(readFileSync(compressed)).toString("utf8"));
  return JSON.parse(readFileSync(new URL(`wetland-${id}.json`, directory), "utf8").replace(/^\uFEFF/, ""));
}
