import { useState } from "react";
import { parseWetlandsGeoJson } from "../data/geojson";
import type { WetlandFeature } from "../data/source";

interface Props {
  onLoad: (wetlands: WetlandFeature[]) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function GeoJsonUploader({ onLoad }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError("El archivo supera el límite de 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      const wetlands = parseWetlandsGeoJson(await file.text());
      onLoad(wetlands);
      setMessage(`Se cargaron ${wetlands.length} humedal(es) desde ${file.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer el GeoJSON.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="import-panel" aria-labelledby="geojson-title">
      <div>
        <h2 id="geojson-title">Configurar un salar</h2>
        <p>Cargá un GeoJSON FeatureCollection con los polígonos de sus humedales.</p>
      </div>
      <label className="file-picker">
        <span>Seleccionar archivo GeoJSON</span>
        <input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={handleFile} />
      </label>
      {message && <p className="import-success" role="status">{message}</p>}
      {error && <p className="import-error" role="alert">{error}</p>}
      <small>
        Requisitos: geometrías Polygon, coordenadas WGS84 [longitud, latitud], wetlandId único,
        name, salar y thresholdNdwi (NDWI × 10.000). Máximo 100 humedales y 5 MB.
      </small>
    </section>
  );
}
