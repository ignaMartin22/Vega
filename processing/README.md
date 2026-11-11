# processing/ — Sentinel-2 → NDWI → registros hasheados

Responsable: **Integrante 2 · Datos satelitales**. Roadmap: [`docs/roadmap/2-datos.md`](../docs/roadmap/2-datos.md)

```bash
npm run search -w @vega/processing   # prueba STAC, guarda respuestas en sample-data/stac/
npm run ndwi                         # (desde la raíz) genera sample-data/measurements.json
npm test -w @vega/processing         # valida el contrato GeoJSON de entrada
```

**Entrada predeterminada:** `sample-data/wetlands.geojson`.

Para procesar otro archivo, definí `WETLANDS_GEOJSON` con una ruta absoluta o relativa al directorio desde el que ejecutás el comando:

```bash
WETLANDS_GEOJSON=./datos/mi-salar.geojson npm run ndwi
```

El archivo debe ser un GeoJSON `FeatureCollection` con entre 1 y 100 Features de geometría `Polygon`. Cada Feature requiere `properties.wetlandId` (entero uint32 positivo y único dentro del archivo), `name`, `salar` y `thresholdNdwi` (entero entre -10000 y 10000). Las coordenadas deben estar en WGS84 (longitud, latitud), con anillos cerrados y área no nula. El tamaño máximo es 5 MB. No se admiten `MultiPolygon` todavía.

La búsqueda STAC usa la geometría completa (`intersects`), no solamente su bounding box. La salida sigue siendo `sample-data/measurements.json`; por eso, antes de ejecutar el pipeline con datos reales, verificá que la salida no vaya a reemplazar mediciones que quieras conservar.

**Estado de implementación:** la entrada GeoJSON configurable y la búsqueda espacial están incorporadas en esta rama. El cálculo NDWI todavía depende de completar `computeNdwi()`; hasta entonces, el pipeline no genera mediciones satelitales reales.
