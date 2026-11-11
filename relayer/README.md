# relayer/ — sella mediciones en Avalanche Fuji

Responsable: **Integrante 3 · Relayer + Infra**. Roadmap: [`docs/roadmap/3-relayer-infra.md`](../docs/roadmap/3-relayer-infra.md)

```bash
npm run dry -w @vega/relayer     # valida hashes, no envía tx
npm run relay                    # (desde la raíz) publica en Fuji
```

**Entrada:** `sample-data/measurements*.json` (`HashedMeasurement[]`) · **Salida:** tx en Fuji + `sample-data/published.json`.
Variables: ver `.env.example` en la raíz (`PRIVATE_KEY`, `FUJI_RPC_URL`, `VEGA_REGISTRY_ADDRESS`).
