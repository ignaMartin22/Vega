# I2 · Datos satelitales

**Sos dueño de:** `processing/`, `sample-data/wetlands.geojson`, `sample-data/stac/`, `sample-data/measurements.json`
**Entregás:** serie histórica real de NDWI (`HashedMeasurement[]`) para 2 o 3 humedales de un salar real
**No dependés de nadie:** no necesitás el contrato ni el relayer. Tu salida es un archivo JSON con formato fijo.

**Entrega técnica I2 implementada:** servicio HTTP, catálogo regional de fuentes IGN/USGS, selección/dibujo Polygon/MultiPolygon, mosaicos entre teselas/UTM e imágenes de evolución del salar completo. Doce pruebas de software aprobadas; casos reales en las tres provincias y corrida de tres años (35 mediciones válidas y 36 mosaicos del salar; un hueco de calidad). Uso en [`processing/API.md`](../../processing/API.md); protocolo/evidencia en [specs/i2-web-analysis/tasks.md](../specs/i2-web-analysis/tasks.md). Pendientes de integración: UI de Sol, despliegue/publicación de Gaby y revisión de IDs/umbrales con Igna. La validación ambiental experta no se declara realizada por pruebas de software.

## Día 1 · Mié 11

- [ ] **Elegir el salar** (con humedales visibles y conflicto conocido; validar con el equipo en 5 minutos)
- [ ] Dibujar 2 o 3 humedales en **geojson.io**, validándolos a ojo en **Copernicus Browser** (true color + NDWI)
- [ ] Reemplazar `sample-data/wetlands.geojson`, manteniendo `wetlandId` 1..3 y las propiedades `name`, `salar` y `thresholdNdwi` → **Hito H2**
- [ ] Probar STAC: `npm run search -w @vega/processing` (busca escenas con `eo:cloud_cover < 20` y guarda en `sample-data/stac/`)
- [ ] Revisar un item STAC: ubicar `assets.green` (B03), `assets.nir` (B08), `assets.scl` y `proj:epsg`
- [ ] Empezar `computeNdwi()` en `processing/src/ndwi.ts`:
  - abrir los COG con `geotiff.fromUrl()` y leer **solo la ventana** del polígono
  - reproyectar el polígono de EPSG:4326 al UTM de la escena (`proj4` si hace falta)
  - enmascarar nubes y sombras con SCL (clases 3, 8, 9 y 10)
  - promediar el NDWI de los píxeles dentro del polígono

> **Plan B si `geotiff` en Node se complica:** Python con `pystac-client` + `rasterio`, escribiendo **el mismo JSON**. Para el hash, el JSON tiene que pasar por `withHash()` de `@vega/shared`: generá un JSON sin `dataHash` y agregá un script de 5 líneas que lo hashee con `withHash()`.

## Día 2 · Jue 12

- [ ] Validar el NDWI de 2 o 3 escenas contra Copernicus Browser (que el orden de magnitud tenga sentido)
- [ ] Filtrar a **una escena por mes** (la de menor nubosidad) de los últimos 2 o 3 años
- [ ] Correr `npm run ndwi` → `sample-data/measurements.json`
- [ ] Chequear con `MEASUREMENTS=sample-data/measurements.json npm run dry -w @vega/relayer` que todos los hashes validen
- [ ] Pushear → **Hito H3** (avisar a I3)
- [ ] Revisar los umbrales con los datos reales: elegir valores que hagan que **al menos un humedal cruce el umbral** en la serie y avisar a I1 y a I3
- [ ] Guardar en `sample-data/stac/` las respuestas reales (plan B offline)

## Entrega

- [ ] Sección de **atribución de datos** en README y pitch (Copernicus, NASA GIBS, Element 84, Natural Earth)
- [ ] Slide "cómo se mide": NDWI, Sentinel-2, por qué es reproducible por cualquiera
- [ ] Explicación en 3 líneas de cómo recalcular un dato (para la pregunta "¿qué pasa si el dato miente?")

## Cómo trabajar sin esperar a otros

| Necesitás… | Usá… |
|---|---|
| Saber qué formato producir | `MeasurementRecord` en `shared/src/types.ts` + `withHash()` |
| Probar que tu salida sirve | `npm run dry -w @vega/relayer` con tu archivo (no envía tx) |
| Ver tus datos en un mapa | Apuntar el mock del frontend a tu archivo, o geojson.io |

**Lo que NO podés hacer sin avisar:** cambiar los campos del registro, el `method` o los `wetlandId`.
