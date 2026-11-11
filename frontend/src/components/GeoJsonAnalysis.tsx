import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { WetlandFeature } from "../data/source";
import { parseAnalysisGeoJson, type AnalysisGeoJsonFeature } from "../data/analysis-geojson";

const API_BASE = (import.meta.env.VITE_ANALYSIS_API_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const MAX_FILE_BYTES = 5 * 1024 * 1024;
type JobStatus = "queued" | "running" | "succeeded" | "partial" | "no_data" | "failed";
interface JobSnapshot {
  id: string;
  status: JobStatus;
  progress: { phase: string; completed: number; total: number };
  error?: string;
  resultUrl?: string;
}
interface AnalysisResult {
  areas: Array<{ feature: WetlandFeature }>;
  measurements: Array<{ wetlandId: number; ndwi: number; sceneId: string; timestamp: number; dataHash: string }>;
  frames: Array<{ frameId: string; wetlandId: number; capturedAt: string; imageUrl: string; bbox: number[]; attribution: string }>;
  issues: Array<{ wetlandId: number; window: number; code: string; message: string }>;
  publication: { status: string; reviewRequired: boolean };
}

const terminal = (status: JobStatus) => ["succeeded", "partial", "no_data", "failed"].includes(status);
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const onAbort = () => { window.clearTimeout(timer); reject(new DOMException("Cancelado", "AbortError")); };
  const timer = window.setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
  signal.addEventListener("abort", onAbort, { once: true });
});

export function GeoJsonAnalysis({ onPreview, onReset }: {
  onPreview: (features: WetlandFeature[]) => void;
  onReset: () => void;
}) {
  const [salarName, setSalarName] = useState("");
  const [salarId, setSalarId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [features, setFeatures] = useState<AnalysisGeoJsonFeature[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  function handleName(value: string) {
    setSalarName(value);
    setSalarId(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80));
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setMessage(""); setResult(null); setJob(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("El archivo supera el límite de 5 MB."); event.target.value = ""; return;
    }
    try {
      const parsed = parseAnalysisGeoJson(await file.text(), salarName.trim() || "Salar por definir");
      setFeatures(parsed.features);
      setFileName(file.name);
      onPreview(parsed.preview);
      setMessage(`${parsed.features.length} polígono(s) validados para vista previa. Completá el nombre del salar antes de procesar.`);
    } catch (cause) {
      setFeatures([]); setFileName(""); onReset();
      setError(cause instanceof Error ? cause.message : "No se pudo leer el GeoJSON.");
    } finally { event.target.value = ""; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setResult(null); setJob(null);
    if (!salarName.trim() || !salarId.trim()) { setError("Completá el nombre y el identificador del salar."); return; }
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(salarId)) { setError("El identificador debe ser un slug: minúsculas, números y guiones."); return; }
    if (!features.length) { setError("Primero cargá una FeatureCollection GeoJSON válida."); return; }
    if ((from && !to) || (!from && to) || (from && to && from >= to)) { setError("Indicá ambas fechas y verificá que la fecha inicial sea anterior a la final."); return; }

    const aborter = new AbortController(); controller.current = aborter; setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        salarId, salarName: salarName.trim(),
        geojson: { type: "FeatureCollection", features },
      };
      if (from && to) { payload.from = new Date(`${from}T00:00:00.000Z`).toISOString(); payload.to = new Date(`${to}T00:00:00.000Z`).toISOString(); }
      const startedResponse = await fetch(`${API_BASE}/api/analyses`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: aborter.signal,
      });
      const started = await startedResponse.json();
      if (!startedResponse.ok) throw new Error(started.error || `No se pudo iniciar el análisis (HTTP ${startedResponse.status}).`);
      const statusUrl = String(started.statusUrl || `/api/analyses/${started.analysisId}`);
      setJob({ id: started.analysisId, status: started.status, progress: { phase: "queued", completed: 0, total: features.length } });

      let finished = false;
      for (let attempt = 0; attempt < 1800; attempt++) {
        await wait(2000, aborter.signal);
        const statusResponse = await fetch(new URL(statusUrl, API_BASE), { signal: aborter.signal });
        const snapshot = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(snapshot.error || "No se pudo consultar el estado del análisis.");
        setJob(snapshot);
        if (terminal(snapshot.status as JobStatus)) {
          if (snapshot.resultUrl) {
            const resultResponse = await fetch(new URL(snapshot.resultUrl, API_BASE), { signal: aborter.signal });
            if (resultResponse.ok) {
              const data = await resultResponse.json() as AnalysisResult;
              setResult(data); setSelectedFrame(0);
              if (data.areas?.length) onPreview(data.areas.map((area) => area.feature));
            } else if (resultResponse.status !== 409) {
              const detail = await resultResponse.json().catch(() => ({}));
              throw new Error(detail.error || "No se pudo recuperar el resultado.");
            }
          }
          finished = true;
          break;
        }
      }
      setMessage(finished
        ? "El trabajo terminó. Revisá las mediciones y las incidencias antes de interpretar los resultados."
        : "El trabajo continúa en el servidor. Podés volver a consultar su estado más tarde.");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "Falló la comunicación con el servicio de análisis.");
      }
    } finally { setSubmitting(false); controller.current = null; }
  }

  function reset() {
    controller.current?.abort();
    setFeatures([]); setFileName(""); setJob(null); setResult(null); setError(""); setMessage("");
    onReset();
  }

  const percent = job && job.progress.total > 0 ? Math.min(100, Math.round(job.progress.completed / job.progress.total * 100)) : 0;
  const frame = result?.frames[selectedFrame];

  return (
    <section className="analysis-card" aria-labelledby="analysis-title">
      <div className="analysis-heading">
        <div>
          <p className="eyebrow">ANÁLISIS SATELITAL</p>
          <h2 id="analysis-title">Procesar un salar</h2>
          <p>Importá polígonos GeoJSON y solicitá un análisis Sentinel-2 / NDWI.</p>
        </div>
        <span className="status-pill">Revisión humana requerida</span>
      </div>

      <form className="analysis-form" onSubmit={submit}>
        <label>Nombre del salar
          <input value={salarName} onChange={(event) => handleName(event.target.value)} placeholder="Ej. Salar de Olaroz" required />
        </label>
        <label>Identificador
          <input value={salarId} onChange={(event) => setSalarId(event.target.value)} placeholder="salar-de-olaroz" required />
        </label>
        <label>Desde (opcional)
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>Hasta (opcional)
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="geojson-picker">
          <span>Archivo GeoJSON</span>
          <input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={handleFile} />
        </label>
        <div className="file-summary">{fileName ? `${fileName} · ${features.length} área(s)` : "Máximo 5 polígonos · 5 MB · Polygon simple"}</div>
        <div className="form-actions">
          <button type="submit" disabled={submitting || !features.length}>{submitting ? "Procesando…" : "Iniciar análisis"}</button>
          <button type="button" className="secondary-button" onClick={reset} disabled={submitting && !job}>Limpiar / volver a ejemplo</button>
        </div>
      </form>

      {error && <p className="feedback error" role="alert">{error}</p>}
      {message && <p className="feedback success" role="status">{message}</p>}

      {job && <div className="job-progress" aria-live="polite">
        <div className="progress-label"><strong>Trabajo {job.id.slice(0, 8)}</strong><span>{job.status} · {percent}%</span></div>
        <progress value={percent} max="100" />
        <small>Etapa: {job.progress.phase} · {job.progress.completed} de {job.progress.total} unidades</small>
        {job.error && <p className="feedback error">{job.error}</p>}
      </div>}

      {result && <div className="analysis-results">
        <div className="results-summary">
          <strong>{result.measurements.length} medición(es) calculada(s)</strong>
          <span>{result.frames.length} fotograma(s) disponibles</span>
        </div>
        <p className="review-warning">Los IDs y umbrales de áreas importadas son provisionales. Estos resultados no se publican en Avalanche automáticamente.</p>
        {frame && <div className="frame-viewer">
          <img src={new URL(frame.imageUrl, API_BASE).toString()} alt={`Imagen Sentinel-2 del ${new Date(frame.capturedAt).toLocaleDateString("es-AR")}`} />
          <div><strong>{new Date(frame.capturedAt).toLocaleDateString("es-AR")}</strong><small>{frame.attribution}</small></div>
        </div>}
        {result.frames.length > 1 && <div className="frame-strip" aria-label="Fotogramas del análisis">
          {result.frames.map((item, index) => <button type="button" key={item.frameId} className={index === selectedFrame ? "frame-active" : ""} onClick={() => setSelectedFrame(index)}>
            {new Date(item.capturedAt).toLocaleDateString("es-AR", { month: "short", year: "numeric" })}
          </button>)}
        </div>}
        {result.measurements.length > 0 && <div className="measurement-table-wrap">
          <table className="measurement-table"><thead><tr><th>Fecha</th><th>NDWI</th><th>Escena Sentinel-2</th></tr></thead>
            <tbody>{result.measurements.map((measurement) => <tr key={measurement.dataHash}>
              <td>{new Date(measurement.timestamp * 1000).toLocaleDateString("es-AR")}</td>
              <td>{(measurement.ndwi / 10000).toFixed(4)}</td><td>{measurement.sceneId}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {result.issues.length > 0 && <details className="issues-panel">
          <summary>{result.issues.length} incidencia(s) del procesamiento</summary>
          <ul>{result.issues.map((issue, index) => <li key={`${issue.wetlandId}-${issue.window}-${index}`}>{issue.message}</li>)}</ul>
        </details>}
      </div>}
      <p className="api-hint">Servicio: {API_BASE}. Para desarrollo local, iniciá el servicio de procesamiento en el puerto 8787.</p>
    </section>
  );
}
