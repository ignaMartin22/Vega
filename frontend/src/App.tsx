import { useEffect, useState } from "react";
import type { OnchainMeasurement } from "@vega/shared";
import { dataSource, wetlands as sampleWetlands } from "./data/source";
import type { WetlandFeature } from "./data/source";
import { GeoJsonUploader } from "./components/GeoJsonUploader";
import { WetlandMap } from "./components/WetlandMap";
import { NdwiChart } from "./components/NdwiChart";
import { VerifyButton } from "./components/VerifyButton";

export default function App() {
  const [activeWetlands, setActiveWetlands] = useState<WetlandFeature[]>(sampleWetlands);
  const [selected, setSelected] = useState(sampleWetlands[0]?.properties.wetlandId ?? 1);
  const [series, setSeries] = useState<OnchainMeasurement[]>([]);
  const [usingUploadedGeoJson, setUsingUploadedGeoJson] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const wetland = activeWetlands.find((w) => w.properties.wetlandId === selected);

  useEffect(() => {
    let active = true;
    if (usingUploadedGeoJson) {
      // Las mediciones mock/on-chain existentes pertenecen a otra geometría:
      // no deben mostrarse para polígonos recién importados.
      setSeries([]);
      return () => { active = false; };
    }

    dataSource.getMeasurements(selected)
      .then((rows) => { if (active) setSeries(rows); })
      .catch((error) => { if (active) console.error(error); });
    return () => { active = false; };
  }, [selected, usingUploadedGeoJson]);

  function handleGeoJsonLoad(nextWetlands: WetlandFeature[]) {
    setActiveWetlands(nextWetlands);
    setSelected(nextWetlands[0].properties.wetlandId);
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
      <header>
        <h1>💧 Vega · agua de la Puna verificable</h1>
      </header>
      <GeoJsonUploader onLoad={handleGeoJsonLoad} />
      {usingUploadedGeoJson && (
        <div className="dataset-notice">
          <span>Vista previa de polígonos importados. Todavía no hay mediciones asociadas a esta geometría.</span>
          <button type="button" onClick={resetSampleData}>Volver a los datos de ejemplo</button>
        </div>
      )}
      <main>
        <WetlandMap
          key={mapVersion}
          wetlands={activeWetlands}
          selected={selected}
          onSelect={setSelected}
        />
        <section className="panel">
          <h2>{wetland?.properties.name}</h2>
          {wetland && <p className="wetland-meta">{wetland.properties.salar} · ID {wetland.properties.wetlandId}</p>}
          {usingUploadedGeoJson ? (
            <p className="empty-series">La importación solo configura y muestra los polígonos. El procesamiento Sentinel-2/NDWI para esta geometría se conectará en la siguiente etapa.</p>
          ) : (
            <>
              <NdwiChart series={series} threshold={wetland?.properties.thresholdNdwi ?? 0} />
              {last && <VerifyButton measurement={last} />}
            </>
          )}
          {/* TODO(Frontend): tabla de mediciones con link a la tx, lista de WaterAlert, atribución de datos */}
        </section>
      </main>
    </>
  );
}
