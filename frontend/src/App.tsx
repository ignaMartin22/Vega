import { useEffect, useState } from "react";
import type { OnchainMeasurement } from "@vega/shared";
import { dataSource, wetlands } from "./data/source";
import { WetlandMap } from "./components/WetlandMap";
import { NdwiChart } from "./components/NdwiChart";
import { VerifyButton } from "./components/VerifyButton";

export default function App() {
  const [selected, setSelected] = useState(wetlands[0]?.properties.wetlandId ?? 1);
  const [series, setSeries] = useState<OnchainMeasurement[]>([]);
  const wetland = wetlands.find((w) => w.properties.wetlandId === selected);

  useEffect(() => {
    dataSource.getMeasurements(selected).then(setSeries).catch(console.error);
  }, [selected]);

  const last = series.at(-1);

  return (
    <>
      <header>
        <h1>💧 Vega · agua de la Puna verificable</h1>
      </header>
      <main>
        <WetlandMap wetlands={wetlands} selected={selected} onSelect={setSelected} />
        <section className="panel">
          <h2>{wetland?.properties.name}</h2>
          <NdwiChart series={series} threshold={wetland?.properties.thresholdNdwi ?? 0} />
          {last && <VerifyButton measurement={last} />}
          {/* TODO(Frontend): tabla de mediciones con link a la tx, lista de WaterAlert, atribución de datos */}
        </section>
      </main>
    </>
  );
}
