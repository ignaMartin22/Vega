import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { fromScaled, type OnchainMeasurement } from "@vega/shared";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function NdwiChart({ series, threshold }: { series: OnchainMeasurement[]; threshold: number }) {
  const labels = series.map((m) => new Date(m.timestamp * 1000).toISOString().slice(0, 7));
  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: "NDWI", data: series.map((m) => fromScaled(m.ndwi)), borderColor: "#2563eb" },
          { label: "Umbral", data: series.map(() => fromScaled(threshold)), borderColor: "#dc2626", borderDash: [6, 4], pointRadius: 0 },
        ],
      }}
    />
  );
}
