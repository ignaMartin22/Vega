/**
 * Capa de datos del frontend. Responsable: Integrante 4 (Frontend).
 * VITE_DATA_SOURCE=mock  -> usa sample-data/measurements.mock.json (no necesita contrato)
 * VITE_DATA_SOURCE=chain -> lee VegaRegistry en Fuji + registros off-chain de VITE_RECORDS_URL
 */
import { Contract, JsonRpcProvider } from "ethers";
import {
  FUJI,
  VEGA_REGISTRY_ABI,
  VEGA_REGISTRY_ADDRESS,
  type HashedMeasurement,
  type MeasurementRecord,
  type OnchainMeasurement,
  type WetlandProperties,
} from "@vega/shared";
import mockMeasurements from "../../../sample-data/measurements.mock.json";
import wetlandsRaw from "../../../sample-data/wetlands.geojson?raw";

export interface WetlandFeature {
  type: "Feature";
  properties: WetlandProperties;
  geometry: { type: "Polygon"; coordinates: number[][][] };
}
export const wetlands: WetlandFeature[] = JSON.parse(wetlandsRaw).features;

export interface DataSource {
  getMeasurements(wetlandId: number): Promise<OnchainMeasurement[]>;
  /** Registro off-chain completo (para recalcular el hash en "Verificar"). */
  getRecord(dataHash: string): Promise<MeasurementRecord | undefined>;
}

const strip = ({ dataHash: _h, ...r }: HashedMeasurement): MeasurementRecord => r;

function mockSource(): DataSource {
  const all = mockMeasurements as HashedMeasurement[];
  return {
    async getMeasurements(id) {
      return all
        .filter((m) => m.wetlandId === id)
        .map(({ wetlandId, ndwi, sceneId, dataHash, timestamp }) => ({ wetlandId, ndwi, sceneId, dataHash, timestamp }));
    },
    async getRecord(hash) {
      const m = all.find((x) => x.dataHash === hash);
      return m && strip(m);
    },
  };
}

function chainSource(): DataSource {
  const address = import.meta.env.VITE_VEGA_REGISTRY_ADDRESS || VEGA_REGISTRY_ADDRESS;
  if (!address) throw new Error("Sin dirección de contrato: usá VITE_DATA_SOURCE=mock");
  const provider = new JsonRpcProvider(import.meta.env.VITE_RPC_URL || FUJI.rpcUrl);
  const registry = new Contract(address, VEGA_REGISTRY_ABI, provider);
  let records: Promise<HashedMeasurement[]> | null = null;
  return {
    async getMeasurements(id) {
      const rows = await registry.getMeasurements(id);
      return rows.map((r: any) => ({
        wetlandId: Number(r.wetlandId),
        ndwi: Number(r.ndwi),
        sceneId: r.sceneId,
        dataHash: r.dataHash,
        timestamp: Number(r.timestamp),
      }));
    },
    async getRecord(hash) {
      records ??= fetch(import.meta.env.VITE_RECORDS_URL || "/records.json").then((r) => r.json());
      const m = (await records).find((x) => x.dataHash === hash);
      return m && strip(m);
    },
  };
  // TODO(Frontend): leer eventos WaterAlert (registry.queryFilter) para listar alertas
}

export const dataSource: DataSource = import.meta.env.VITE_DATA_SOURCE === "chain" ? chainSource() : mockSource();
