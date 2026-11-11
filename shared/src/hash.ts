import { keccak256, toUtf8Bytes } from "ethers";
import type { HashedMeasurement, MeasurementRecord } from "./types.js";

/** Orden fijo de claves: la serialización canónica NO depende del orden del objeto. */
const KEY_ORDER: (keyof MeasurementRecord)[] = [
  "schema", "wetlandId", "ndwi", "sceneId", "timestamp", "cloudCover", "validPixels", "method",
];

/** JSON canónico: claves en KEY_ORDER, sin espacios, UTF-8. */
export function canonicalize(r: MeasurementRecord): string {
  const ordered: Record<string, unknown> = {};
  for (const k of KEY_ORDER) {
    if (r[k] === undefined) throw new Error(`Falta el campo ${k}`);
    ordered[k] = r[k];
  }
  return JSON.stringify(ordered);
}

/** dataHash = keccak256(utf8(canonicalize(record))). Usado por relayer y por "Verificar". */
export function hashRecord(r: MeasurementRecord): `0x${string}` {
  return keccak256(toUtf8Bytes(canonicalize(r))) as `0x${string}`;
}

export function withHash(r: MeasurementRecord): HashedMeasurement {
  return { ...r, dataHash: hashRecord(r) };
}

/** Verificación: recalcula el hash del registro off-chain y lo compara con el on-chain. */
export function verify(r: MeasurementRecord, onchainHash: string): boolean {
  return hashRecord(r).toLowerCase() === onchainHash.toLowerCase();
}

export const toScaled = (ndwi: number) => Math.round(ndwi * 10_000);
export const fromScaled = (n: number) => n / 10_000;
