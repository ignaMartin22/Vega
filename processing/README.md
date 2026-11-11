# processing/ — Sentinel-2 → NDWI → registros hasheados

Responsable: **Integrante 2 · Datos satelitales**. Roadmap: [`docs/roadmap/2-datos.md`](../docs/roadmap/2-datos.md)

```bash
npm run search -w @vega/processing   # prueba STAC, guarda respuestas en sample-data/stac/
npm run ndwi                         # (desde la raíz) genera sample-data/measurements.json
```

**Entrada:** `sample-data/wetlands.geojson` · **Salida:** `sample-data/measurements.json` con formato `HashedMeasurement[]` de `@vega/shared`.
