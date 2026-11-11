/** Cliente que Sol puede importar sin dependencias del backend ni cambios en frontend/. */
export class AnalysisClient {
  constructor(readonly baseUrl: string) {}
  private async request(path: string, init?: RequestInit): Promise<any> {
    const response = await fetch(new URL(path, this.baseUrl), init);
    const value = await response.json();
    if (!response.ok) throw new Error(value.error ?? `HTTP ${response.status}`);
    return value;
  }
  salars(province?: string) {
    return this.request(
      `/api/salars${province ? `?province=${encodeURIComponent(province)}` : ""}`,
    );
  }
  wetlands(id: string) {
    return this.request(`/api/salars/${encodeURIComponent(id)}/wetlands`);
  }
  start(input: {
    salarId: string;
    wetlandIds?: number[];
    areas?: unknown[];
    from?: string;
    to?: string;
  }) {
    return this.request("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  status(id: string) {
    return this.request(`/api/analyses/${encodeURIComponent(id)}`);
  }
  result(id: string) {
    return this.request(`/api/analyses/${encodeURIComponent(id)}/result`);
  }
  imageUrl(relative: string) {
    return new URL(relative, this.baseUrl).href;
  }
  async wait(
    id: string,
    onProgress: (job: any) => void = () => {},
    signal?: AbortSignal,
  ): Promise<any> {
    for (;;) {
      signal?.throwIfAborted();
      const job = await this.status(id);
      onProgress(job);
      if (!["queued", "running"].includes(job.status)) {
        if (job.status === "failed")
          throw new Error(job.error ?? "Falló el análisis");
        return this.result(id);
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal!.reason);
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        }, 1500);
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    }
  }
}
