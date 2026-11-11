# relayer/ — sella mediciones en Avalanche Fuji

Responsable: **Integrante 3 · Relayer + Infra**. Roadmap: [`docs/roadmap/3-relayer-infra.md`](../docs/roadmap/3-relayer-infra.md)

```bash
npm run dry -w @vega/relayer     # valida hashes, no envía tx
npm run relay                    # (desde la raíz) publica en Fuji
```

**Entrada:** `sample-data/measurements*.json` (`HashedMeasurement[]`) · **Salidas:** tx en Fuji, historial acumulado `sample-data/published.json` y registros de verificación `frontend/public/records.json`.
Variables: ver `.env.example` en la raíz (`PRIVATE_KEY`, `FUJI_RPC_URL`, `VEGA_REGISTRY_ADDRESS`).

Las ejecuciones conservan las publicaciones anteriores y agregan registros nuevos deduplicando por `dataHash`. El archivo `records.json` contiene los registros completos necesarios para que el frontend recalcule el hash.

```bash
npm run test -w @vega/relayer     # prueba acumulación y deduplicación de salidas
```
