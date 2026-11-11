# Interfaces entre módulos (contrato del equipo)

Estas interfaces están **congeladas desde el día 1**. Son lo que permite que cada integrante trabaje sin esperar a nadie: todos programan contra estos formatos y contra datos mock, no contra el código de otro.

> **Regla:** si necesitás cambiar algo de este archivo, avisá en el grupo **antes**, actualizá `shared/` y este doc en el mismo commit, y corré `npm run typecheck` desde la raíz.

## Flujo y puntos de intercambio

```
 I2 Datos                      I3 Relayer                     I1 Contratos
 processing/ ──► measurements.json ──► relayer/ ──► tx ──► VegaRegistry (Fuji)
                       │                    │                      │
                       │                    └─► published.json     │ fuji.json (address)
                       ▼                                           ▼
                 records.json  ─────────────►  I4 frontend/  ◄── getMeasurements()
```

Los módulos se comunican **solo a través de archivos y del contrato**:

| Punto de intercambio | Formato | Lo escribe | Lo leen | Mientras no existe, usar |
|---|---|---|---|---|
| `sample-data/wetlands.geojson` | GeoJSON con `WetlandProperties` | I2 | I2, I4, I1 (umbrales) | Los polígonos de ejemplo ya incluidos |
| `sample-data/measurements.json` | `HashedMeasurement[]` | I2 | I3, I4 | `sample-data/measurements.mock.json` (`npm run mock`) |
| `shared/deployments/fuji.json` | `{ address, deployBlock, deployTx }` | I1 | I3, I4 | Anvil local / modo mock del frontend |
| `contracts/src/IVegaRegistry.sol` ≡ `shared/src/abi.ts` | ABI | I1 | I3, I4 | Ya está definida y no cambia |
| `sample-data/published.json` | `HashedMeasurement & { txHash }` | I3 | I4 | Mock sin `txHash` |

## 1. Registro de medición (`shared/src/types.ts`)

```ts
interface MeasurementRecord {
  schema: "vega.measurement.v1";
  wetlandId: number;   // uint32, igual a properties.wetlandId del GeoJSON
  ndwi: number;        // ENTERO = NDWI × 10_000 (0.2345 -> 2345)
  sceneId: string;     // id del item STAC de Sentinel-2 L2A
  timestamp: number;   // unix SEGUNDOS de adquisición de la escena
  cloudCover: number;  // eo:cloud_cover
  validPixels: number; // píxeles usados en el promedio
  method: "NDWI=(B03-B08)/(B03+B08);mean;SCL-masked;v1";
}
interface HashedMeasurement extends MeasurementRecord { dataHash: `0x${string}` }
```

## 2. Hash (`shared/src/hash.ts`)

```
dataHash = keccak256( utf8( JSON.stringify(record con claves en este orden) ) )
orden:   schema, wetlandId, ndwi, sceneId, timestamp, cloudCover, validPixels, method
```

- Usar **siempre** `hashRecord()` / `withHash()` / `verify()` de `@vega/shared`. Nunca reimplementarlo.
- El relayer **rechaza** cualquier registro cuyo `dataHash` no coincida (ver `npm run dry -w @vega/relayer`).

## 3. Contrato `VegaRegistry` (`contracts/src/IVegaRegistry.sol`)

| Función / evento | Quién la usa |
|---|---|
| `recordMeasurement(uint32 wetlandId, int32 ndwi, string sceneId, bytes32 dataHash, uint64 timestamp)`: solo publishers, revierte si el hash ya existe | Relayer |
| `setThreshold(uint32, int32)` / `setPublisher(address, bool)`: solo owner | Contratos (deploy) |
| `getMeasurements(uint32) → Measurement[]` | Frontend |
| `isRecorded(bytes32) → bool` | Relayer (idempotencia), Frontend |
| `thresholds(uint32) → int32` | Frontend |
| `event MeasurementRecorded(uint32 indexed wetlandId, int32 ndwi, string sceneId, bytes32 dataHash, uint64 timestamp)` | Frontend |
| `event WaterAlert(uint32 indexed wetlandId, int32 ndwi, int32 threshold, uint64 timestamp)` | Frontend, video demo |

## 4. Humedales

- `wetlandId` 1, 2 y 3. Umbrales iniciales (×10.000): **1 → 1500, 2 → 1000, 3 → 1200**.
- Deben coincidir en `sample-data/wetlands.geojson` (`thresholdNdwi`) y en `contracts/script/Deploy.s.sol`.
- Si I2 cambia un umbral tras ver los datos reales, avisa a I1 (se corrige con `setThreshold`, sin redeploy).

## 5. Variables de entorno

Ver `.env.example`. Un solo `.env` en la raíz (nunca se commitea). La clave privada es de una cuenta **exclusiva del hackathon**.
