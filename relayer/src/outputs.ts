import type { HashedMeasurement } from "@vega/shared";

export type PublishedMeasurement = HashedMeasurement & { txHash: string };

function mergeByDataHash<T extends HashedMeasurement>(existing: T[], additions: T[]): T[] {
  const merged = new Map<string, T>();
  for (const record of [...existing, ...additions]) {
    const key = record.dataHash.toLowerCase();
    if (!merged.has(key)) merged.set(key, record);
  }
  return [...merged.values()];
}

/** Conserva los enlaces publicados y agrega solo transacciones nuevas. */
export function mergePublishedMeasurements(
  existing: PublishedMeasurement[],
  additions: PublishedMeasurement[],
): PublishedMeasurement[] {
  return mergeByDataHash(existing, additions);
}

/** Registros off-chain completos que usa el botón de verificación. */
export function mergeMeasurements(
  existing: HashedMeasurement[],
  additions: HashedMeasurement[],
): HashedMeasurement[] {
  return mergeByDataHash(existing, additions);
}
