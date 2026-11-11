export interface Period {
  from: string;
  to: string;
}
export interface Window extends Period {
  index: number;
}

/** Resta meses calendario sin desbordar 29/30/31 hacia el siguiente mes. */
export function shiftMonths(date: Date, offset: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + offset);
  const last = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}

export function resolvePeriod(
  from?: string,
  to?: string,
  now = new Date(),
): Period {
  if (from !== undefined && to === undefined)
    throw new Error("Indicá from y to juntos");
  for (const value of [from, to]) {
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(
        value,
      ) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10))
    )
      throw new Error("Usá fechas ISO UTC válidas");
  }
  const end = to === undefined ? new Date(now) : new Date(to);
  const start = from === undefined ? shiftMonths(end, -36) : new Date(from);
  if (
    !Number.isFinite(end.getTime()) ||
    !Number.isFinite(start.getTime()) ||
    start >= end
  )
    throw new Error("Intervalo inválido");
  if (end > now) throw new Error("La fecha final no puede ser futura");
  if (start < shiftMonths(end, -36))
    throw new Error("El intervalo máximo es tres años");
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Ventanas [from,to), ancladas en el extremo final original; sin deriva por fin de mes. */
export function monthlyWindows(period: Period): Window[] {
  const start = new Date(period.from),
    end = new Date(period.to);
  const boundaries = [end];
  for (let offset = -1; offset >= -36; offset--) {
    const boundary = shiftMonths(end, offset);
    if (boundary <= start) break;
    boundaries.push(boundary);
  }
  boundaries.push(start);
  boundaries.reverse();
  return boundaries
    .slice(1)
    .map((value, index) => ({
      index,
      from: boundaries[index].toISOString(),
      to: value.toISOString(),
    }));
}
