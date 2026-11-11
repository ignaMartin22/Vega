const RETRYABLE_CODES = new Set([
  "NETWORK_ERROR", "SERVER_ERROR", "TIMEOUT", "UNKNOWN_ERROR",
  "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN",
]);

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  pause?: (milliseconds: number) => Promise<void>;
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const details = error as { code?: unknown; status?: unknown };
  if (typeof details.code === "string" && RETRYABLE_CODES.has(details.code)) return true;
  return [429, 500, 502, 503, 504].includes(Number(details.status));
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/** Reintenta consultas RPC idempotentes ante errores transitorios. */
export async function retryRpc<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 250;
  const pause = options.pause ?? delay;
  if (!Number.isSafeInteger(attempts) || attempts < 1) throw new Error("attempts debe ser un entero positivo");

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) throw error;
      await pause(delayMs * attempt);
    }
  }
}
