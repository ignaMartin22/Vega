import type { HashedMeasurement } from "@vega/shared";

function positiveInteger(value: string | undefined, flag: string): number {
  if (value === undefined) throw new Error(`${flag} requiere un valor`);
  if (!/^\d+$/.test(value)) throw new Error(`${flag} requiere un entero positivo`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${flag} requiere un entero positivo`);
  return parsed;
}

/** Selecciona un subconjunto determinista de mediciones para la demo. */
export function selectMeasurements(records: HashedMeasurement[], args: string[]): HashedMeasurement[] {
  let wetlandId: number | undefined;
  let limit: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--dry-run") continue;
    if (flag === "--only-wetland") {
      if (wetlandId !== undefined) throw new Error("--only-wetland no puede repetirse");
      wetlandId = positiveInteger(args[++i], "--only-wetland");
      continue;
    }
    if (flag === "--limit") {
      if (limit !== undefined) throw new Error("--limit no puede repetirse");
      limit = positiveInteger(args[++i], "--limit");
      continue;
    }
    throw new Error(`Opción desconocida: ${flag}`);
  }

  const filtered = wetlandId === undefined ? records : records.filter((record) => record.wetlandId === wetlandId);
  return limit === undefined ? filtered : filtered.slice(0, limit);
}
