# frontend/ — mapa, serie NDWI y botón "Verificar"

Responsable: **Integrante 4 · Frontend**. Roadmap: [`docs/roadmap/4-frontend.md`](../docs/roadmap/4-frontend.md)

```bash
npm run dev:front   # (desde la raíz) http://localhost:5173
```

- `VITE_DATA_SOURCE=mock` (por defecto): usa `sample-data/measurements.mock.json`. No necesita contrato ni relayer.
- `VITE_DATA_SOURCE=chain`: lee `VegaRegistry` en Fuji (dirección en `shared/deployments/fuji.json`) y los registros off-chain de `VITE_RECORDS_URL`.
