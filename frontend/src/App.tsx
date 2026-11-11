import { useEffect, useState } from "react";
import type { OnchainMeasurement } from "@vega/shared";
import { dataSource, wetlands as sampleWetlands } from "./data/source";
import type { WetlandFeature } from "./data/source";
import { GeoJsonAnalysis } from "./components/GeoJsonAnalysis";
import { WetlandMap } from "./components/WetlandMap";
import { NdwiChart } from "./components/NdwiChart";
import { VerifyButton } from "./components/VerifyButton";

export default function App() {
  const [activeWetlands, setActiveWetlands] = useState<WetlandFeature[]>(sampleWetlands);
  const [selected, setSelected] = useState(sampleWetlands[0]?.properties.wetlandId ?? 1);
  const [series, setSeries] = useState<OnchainMeasurement[]>([]);
  const [usingUploadedGeoJson, setUsingUploadedGeoJson] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const wetland = activeWetlands.find((item) => item.properties.wetlandId === selected);

  useEffect(() => {
    let active = true;
    if (usingUploadedGeoJson) {
      setSeries([]);
      return () => { active = false; };
    }
    dataSource.getMeasurements(selected)
      .then((rows) => { if (active) setSeries(rows); })
      .catch((error) => { if (active) console.error(error); });
    return () => { active = false; };
  }, [selected, usingUploadedGeoJson]);

  function handlePreview(next: WetlandFeature[]) {
    setActiveWetlands(next);
    setSelected(next[0]?.properties.wetlandId ?? 1);
    setSeries([]);
    setUsingUploadedGeoJson(true);
    setMapVersion((version) => version + 1);
  }

  function resetSampleData() {
    setActiveWetlands(sampleWetlands);
    setSelected(sampleWetlands[0]?.properties.wetlandId ?? 1);
    setSeries([]);
    setUsingUploadedGeoJson(false);
    setMapVersion((version) => version + 1);
  }

  const last = series.at(-1);

  return (
    <>
      <header className="site-header">
        <div className="brand-mark">V</div>
        <div><h1>VEGA</h1><p>Monitoreo ambiental · Puna argentina</p></div>
        <span className="header-tag">CIENCIA · AGUA · TERRITORIO</span>
      </header>
      <GeoJsonAnalysis onPreview={handlePreview} onReset={resetSampleData} />
      {usingUploadedGeoJson && (
        <div className="dataset-notice">
          <span>Vista previa de geometrías importadas. Las mediciones se mostrarán cuando finalice el análisis del servicio.</span>
          <button type="button" onClick={resetSampleData}>Volver a datos de ejemplo</button>
        </div>
      )}
      <main>
        <section className="map-panel">
          <div className="section-heading"><div><p className="eyebrow">EXPLORADOR GEOGRÁFICO</p><h2>Áreas de monitoreo</h2></div>
            <span>{activeWetlands.length} área(s)</span></div>
          <WetlandMap key={mapVersion} wetlands={activeWetlands} selected={selected} onSelect={setSelected} />
          <p className="map-caption">Los polígonos representan áreas de análisis. La geometría importada requiere revisión territorial antes de su uso institucional.</p>
        </section>
        <section className="panel data-panel">
          <div><p className="eyebrow">SERIE AMBIENTAL</p><h2>{wetland?.properties.name ?? "Seleccioná un área"}</h2>
            {wetland && <p className="wetland-meta">{wetland.properties.salar} · ID {wetland.properties.wetlandId}</p>}</div>
          {usingUploadedGeoJson ? (
            <div className="empty-series"><strong>Área importada</strong><p>La vista previa no reutiliza mediciones mock ni registros on-chain de otras geometrías. Consultá los resultados del trabajo de análisis en el panel superior.</p></div>
          ) : (
            <>
              <NdwiChart series={series} threshold={wetland?.properties.thresholdNdwi ?? 0} />
              {last && <VerifyButton measurement={last} />}
              {!last && <p className="empty-series">No hay mediciones disponibles para esta área en la fuente seleccionada.</p>}
            </>
          )}
        </section>
      </main>
      <footer>VEGA · Evidencia ambiental trazable · Los resultados requieren interpretación y validación científica.</footer>
    </>
  );
}
