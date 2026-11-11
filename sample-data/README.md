# sample-data/ — datos compartidos y plan B offline

| Archivo | Lo produce | Lo consume |
|---|---|---|
| `wetlands.geojson` | Datos (I2) | processing, frontend, Deploy.s.sol (umbrales) |
| `measurements.mock.json` | `npm run mock` | relayer y frontend mientras no hay datos reales |
| `measurements.json` | processing (I2) | relayer (I3), frontend (`public/records.json`) |
| `published.json` | relayer (I3) | frontend (links a tx), video demo |
| `stac/*.json` | `npm run search -w @vega/processing` | plan B si falla internet |

Formato de las mediciones: `HashedMeasurement[]` (ver `shared/src/types.ts` y `docs/INTERFACES.md`).
