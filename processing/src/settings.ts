/** Configuración reproducible: las mismas variables sirven para search y start. */
export function settings() {
  const from = process.env.FROM ?? "2023-01-01T00:00:00Z";
  const to = process.env.TO ?? "2025-12-31T23:59:59Z";
  const maxCloud = Number(process.env.MAX_CLOUD ?? 20);
  const limit = Number(process.env.LIMIT ?? 0);
  const concurrency = Number(process.env.CONCURRENCY ?? 3);
  const minValidFraction = Number(process.env.MIN_VALID_FRACTION ?? 0.5);
  const wetlandId = process.env.WETLAND_ID ? Number(process.env.WETLAND_ID) : undefined;
  if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from) > Date.parse(to)) throw new Error("FROM/TO inválidos");
  if (!Number.isFinite(maxCloud) || maxCloud <= 0 || maxCloud > 100) throw new Error("MAX_CLOUD debe estar en (0,100]");
  if (!Number.isInteger(limit) || limit < 0) throw new Error("LIMIT debe ser entero >= 0");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("CONCURRENCY debe estar entre 1 y 8");
  if (!Number.isFinite(minValidFraction) || minValidFraction <= 0 || minValidFraction > 1) throw new Error("MIN_VALID_FRACTION debe estar en (0,1]");
  if (wetlandId !== undefined && (!Number.isInteger(wetlandId) || wetlandId < 1)) throw new Error("WETLAND_ID inválido");
  return { from, to, maxCloud, limit, concurrency, minValidFraction, wetlandId, offline: process.env.OFFLINE === "1" };
}
