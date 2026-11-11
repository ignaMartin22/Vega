/**
 * Relayer: lee mediciones hasheadas y las sella en VegaRegistry (Fuji).
 * Responsable: Integrante 3 (Relayer + Infra).
 *
 *   npm run dry -w @vega/relayer      -> valida hashes sin enviar tx
 *   npm run relay                     -> publica (requiere PRIVATE_KEY y dirección del contrato)
 *   MEASUREMENTS=sample-data/measurements.json npm run relay   -> usa los datos reales
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { FUJI, VEGA_REGISTRY_ABI, VEGA_REGISTRY_ADDRESS, hashRecord, txUrl, type HashedMeasurement } from "@vega/shared";

const ROOT = new URL("../../", import.meta.url);
const dryRun = process.argv.includes("--dry-run");
const file = process.env.MEASUREMENTS ?? "sample-data/measurements.mock.json";
const records: HashedMeasurement[] = JSON.parse(readFileSync(new URL(file, ROOT), "utf8"));

// 1. Validar que cada dataHash corresponde a su registro (nunca publicar algo que no verifica)
for (const r of records) {
  const { dataHash, ...rest } = r;
  if (hashRecord(rest) !== dataHash) throw new Error(`Hash inválido en ${r.sceneId}`);
}
console.log(`${records.length} registros válidos en ${file}`);
if (dryRun) process.exit(0);

// 2. Publicar
const address = process.env.VEGA_REGISTRY_ADDRESS || VEGA_REGISTRY_ADDRESS;
if (!address) throw new Error("Falta la dirección del contrato (shared/deployments/fuji.json o VEGA_REGISTRY_ADDRESS)");
if (!process.env.PRIVATE_KEY) throw new Error("Falta PRIVATE_KEY en .env");

const provider = new JsonRpcProvider(process.env.FUJI_RPC_URL ?? FUJI.rpcUrl);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const registry = new Contract(address, VEGA_REGISTRY_ABI, wallet);

const published: (HashedMeasurement & { txHash: string })[] = [];
for (const r of records) {
  if (await registry.isRecorded(r.dataHash)) {
    console.log(`= ya sellado ${r.sceneId}`);
    continue; // idempotente: se puede re-ejecutar sin duplicar
  }
  const tx = await registry.recordMeasurement(r.wetlandId, r.ndwi, r.sceneId, r.dataHash, r.timestamp);
  await tx.wait();
  console.log(`+ ${r.sceneId} ndwi=${r.ndwi} ${txUrl(tx.hash)}`);
  published.push({ ...r, txHash: tx.hash });
}

// TODO(Relayer): mergear con publicaciones anteriores en vez de sobrescribir y
// servir records.json para el frontend (copiar a frontend/public/ o HTTP desde Oracle Cloud).
writeFileSync(new URL("sample-data/published.json", ROOT), JSON.stringify(published, null, 2) + "\n");
console.log(`Publicadas ${published.length} mediciones nuevas -> sample-data/published.json`);
