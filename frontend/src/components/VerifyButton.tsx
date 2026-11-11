import { useState } from "react";
import { hashRecord, type OnchainMeasurement } from "@vega/shared";
import { dataSource } from "../data/source";

/** Recalcula el hash del registro off-chain y lo compara con el dataHash on-chain. */
export function VerifyButton({ measurement }: { measurement: OnchainMeasurement }) {
  const [result, setResult] = useState<"ok" | "bad" | "missing" | null>(null);

  async function verify() {
    const record = await dataSource.getRecord(measurement.dataHash);
    if (!record) return setResult("missing");
    setResult(hashRecord(record) === measurement.dataHash ? "ok" : "bad");
  }

  return (
    <div>
      <button onClick={verify}>Verificar última medición ({measurement.sceneId})</button>{" "}
      {result === "ok" && <span className="badge ok">✔ coincide con lo registrado en Avalanche</span>}
      {result === "bad" && <span className="badge bad">✘ el dato fue alterado</span>}
      {result === "missing" && <span className="badge bad">sin registro off-chain</span>}
      {/* TODO(Frontend): link a la escena en Copernicus Browser y a la tx en el explorer */}
    </div>
  );
}
