# frontend/ — interfaz Vega

Responsable: Integrante 4 · Frontend.

## Desarrollo local

Desde la raíz del monorepo:

```bash
npm ci
npm run serve -w @vega/processing
npm run dev:front
```

La interfaz queda en `http://localhost:5173` y el servicio de análisis en `http://127.0.0.1:8787`. Si el servicio está en otro origen, configurar `VITE_ANALYSIS_API_URL` antes de iniciar Vite.

## Fuentes de mediciones existentes

- `VITE_DATA_SOURCE=mock` (por defecto): usa `sample-data/measurements.mock.json`.
- `VITE_DATA_SOURCE=chain`: lee VegaRegistry en Fuji y los registros off-chain de `VITE_RECORDS_URL`.

La importación GeoJSON no reutiliza mediciones mock/on-chain de geometrías distintas.

## Procesar un salar importado

La pantalla admite un archivo GeoJSON FeatureCollection de 1 a 5 Features Polygon simples, con un anillo exterior cerrado, coordenadas WGS84 `[longitud, latitud]` y hasta 501 posiciones por anillo. Tamaño máximo: 5 MB. El nombre del humedal es opcional; si falta, se asigna un nombre de vista previa.

Se solicita el análisis con `POST /api/analyses` y se consulta el estado hasta completar el trabajo. La interfaz muestra avance, NDWI, incidencias y fotogramas disponibles. El motor asigna IDs provisionales; no se publican automáticamente en Avalanche.

Para salares externos al catálogo, esta interfaz depende de la rama/PR que agrega `salarId`, `salarName` y `geojson` al servicio. La aceptación de una geometría no certifica que sus límites correspondan al salar nombrado. Los resultados requieren revisión científica y territorial.

## Pruebas

```bash
npm test -w @vega/frontend
npm run typecheck -w @vega/frontend
npm run build -w @vega/frontend
```
