# frontend/ — mapa, serie NDWI y botón "Verificar"

Responsable: **Integrante 4 · Frontend**. Roadmap: [`docs/roadmap/4-frontend.md`](../docs/roadmap/4-frontend.md)

```bash
npm run dev:front   # (desde la raíz) http://localhost:5173
```

- `VITE_DATA_SOURCE=mock` (por defecto): usa `sample-data/measurements.mock.json`. No necesita contrato ni relayer.
- `VITE_DATA_SOURCE=chain`: lee `VegaRegistry` en Fuji (dirección en `shared/deployments/fuji.json`) y los registros off-chain de `VITE_RECORDS_URL`.

## Importar humedales desde GeoJSON

La pantalla permite cargar un `FeatureCollection` propio para previsualizar los humedales de otro salar sin modificar los archivos de ejemplo.

- Una `Feature` por humedal, con geometría `Polygon` (MultiPolygon todavía no está soportado).
- Coordenadas GeoJSON RFC 7946: WGS84 / EPSG:4326, orden `[longitud, latitud]`.
- Propiedades obligatorias: `wetlandId` (entero único), `name`, `salar` y `thresholdNdwi` (NDWI × 10.000).
- Límite de importación: 100 humedales y 5 MB.

La importación valida la estructura y muestra los polígonos en el mapa. No genera ni reutiliza mediciones: los resultados Sentinel-2/NDWI para una geometría importada deben procesarse antes de aparecer asociados a ella.
