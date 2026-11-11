/**
 * CONTRATO DE DATOS ENTRE MÓDULOS. Congelado: cambiarlo requiere avisar a los 4.
 * Ver docs/INTERFACES.md
 */

/** Versión del método de cálculo; si cambia el algoritmo, sube la versión. */
export const NDWI_METHOD = "NDWI=(B03-B08)/(B03+B08);mean;SCL-masked;v1" as const;
export const RECORD_SCHEMA = "vega.measurement.v1" as const;

/** Factor de escala: el NDWI se guarda como entero (ndwi * 10_000). */
export const NDWI_SCALE = 10_000;

/** Registro off-chain completo. Su hash (dataHash) es lo que se sella on-chain. */
export interface MeasurementRecord {
  schema: typeof RECORD_SCHEMA;
  wetlandId: number;     // uint32, coincide con properties.wetlandId del GeoJSON
  ndwi: number;          // entero, NDWI × 10_000 (ej. 0.2345 -> 2345)
  sceneId: string;       // ID de item STAC, ej. "S2B_19KGA_20240115_0_L2A"
  timestamp: number;     // unix segundos de ADQUISICIÓN de la escena (no de publicación)
  cloudCover: number;    // eo:cloud_cover de la escena (0-100)
  validPixels: number;   // píxeles válidos usados en el promedio
  method: typeof NDWI_METHOD;
}

/** Registro + hash, tal como lo produce processing/ y consume relayer/ y frontend/. */
export interface HashedMeasurement extends MeasurementRecord {
  dataHash: `0x${string}`;
}

/** Lo que devuelve el contrato en getMeasurements(). */
export interface OnchainMeasurement {
  wetlandId: number;
  ndwi: number;
  sceneId: string;
  dataHash: `0x${string}`;
  timestamp: number;
}

/** Propiedades obligatorias de cada Feature en sample-data/wetlands.geojson */
export interface WetlandProperties {
  wetlandId: number;
  name: string;
  salar: string;
  thresholdNdwi: number; // entero ×10_000, umbral de alerta
}
