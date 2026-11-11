import { useState } from "react";
import { hashRecord, type OnchainMeasurement } from "@vega/shared";
import { dataSource } from "../data/source";

type VerificationStatus = "loading" | "ok" | "hash-mismatch" | "field-mismatch" | "missing" | "error";

interface VerificationResult {
  dataHash: string;
  status: VerificationStatus;
}

/** Comprueba que el registro off-chain coincida con su hash y con los campos on-chain. */
export function VerifyButton({ measurement }: { measurement: OnchainMeasurement }) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const isCurrentResult = result?.dataHash.toLowerCase() === measurement.dataHash.toLowerCase();
  const status = isCurrentResult ? result.status : null;
  const isLoading = status === "loading";

  async function verify() {
    const dataHash = measurement.dataHash;
    setResult({ dataHash, status: "loading" });

    try {
      const record = await dataSource.getRecord(dataHash);
      if (!record) {
        setResult({ dataHash, status: "missing" });
        return;
      }

      const fieldsMatch =
        record.wetlandId === measurement.wetlandId &&
        record.ndwi === measurement.ndwi &&
        record.sceneId === measurement.sceneId &&
        record.timestamp === measurement.timestamp;

      if (!fieldsMatch) {
        setResult({ dataHash, status: "field-mismatch" });
        return;
      }

      const hashMatches = hashRecord(record).toLowerCase() === dataHash.toLowerCase();
      setResult({ dataHash, status: hashMatches ? "ok" : "hash-mismatch" });
    } catch {
      setResult({ dataHash, status: "error" });
    }
  }

  return (
    <div>
      <button onClick={verify} disabled={isLoading}>
        {isLoading ? "Verificando…" : `Verificar última medición (${measurement.sceneId})`}
      </button>{" "}
      {status === "ok" && <span className="badge ok">✔ registro, hash y campos coinciden con Avalanche</span>}
      {status === "hash-mismatch" && <span className="badge bad">✘ el hash del registro no coincide con Avalanche</span>}
      {status === "field-mismatch" && <span className="badge bad">✘ los campos del registro no coinciden con los datos de Avalanche</span>}
      {status === "missing" && <span className="badge bad">sin registro off-chain</span>}
      {status === "error" && <span className="badge bad">no se pudo completar la verificación; intentá nuevamente</span>}
    </div>
  );
}
