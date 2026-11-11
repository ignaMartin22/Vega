# Datos satelitales de Vega (I2)

> **Estado:** existe un primer servicio HTTP de análisis, con trabajos persistidos, tres años móviles e imágenes por área. Catálogo piloto parcial; todavía no completa el alcance regional ni el mosaico del salar. Ver [API.md](API.md) para usarlo y sus límites. El período fijo y los archivos históricos descriptos abajo pertenecen a la prueba técnica anterior.

El pipeline consulta Sentinel-2 L2A en Earth Search, calcula NDWI sobre cada AOI y escribe `HashedMeasurement[]` con `withHash()` de `@vega/shared`. No cambia el esquema ni las interfaces del equipo.

**Entrega generada:** 105 mediciones reales de 2023-2025 (35/34/36 por AOI), con hashes validados por el relayer. Se excluyeron tres meses sin cobertura válida suficiente; están identificados en el informe. Ver [HANDOFF.md](HANDOFF.md).

## Ejecutar

Desde la raíz, con Node 22 y `npm install`:

```powershell
npm run search -w @vega/processing
npm run ndwi
npm run test -w @vega/processing
npm run preview -w @vega/processing
npm run summary -w @vega/processing
$env:MEASUREMENTS='sample-data/measurements.json'
npm run dry -w @vega/relayer
```

Por defecto procesa **2023-01-01 a 2025-12-31**, una escena por mes y por AOI, nubosidad de escena menor al 20%, hasta tres cálculos concurrentes. La selección requiere cobertura completa del polígono y al menos **50% de píxeles válidos**. Ordena por nubosidad de escena, fecha e ID; si la primera no supera los controles, prueba la siguiente del mes. No interpola meses sin observaciones aceptables.

Corrida pequeña para investigar un problema:

```powershell
$env:FROM='2024-04-01T00:00:00Z'
$env:TO='2024-06-30T23:59:59Z'
$env:WETLAND_ID='1'
$env:LIMIT='1'
$env:OUTPUT='sample-data/measurements.pilot.json'
npm run ndwi
```

Las variables `FROM`, `TO`, `MAX_CLOUD`, `WETLAND_ID`, `LIMIT`, `OUTPUT`, `CONCURRENCY` y `MIN_VALID_FRACTION` son opcionales. `LIMIT` limita meses por AOI, no el total de registros. Con `LIMIT` o `WETLAND_ID` se exige un `OUTPUT` explícito. Abrí otra terminal o eliminá esas variables antes de generar la serie completa.

`OFFLINE=1` reutiliza las búsquedas guardadas sin pérdida en `sample-data/stac/wetland-N.json.gz`; **todavía necesita acceso a los COG**. El plan B completamente offline son los registros ya calculados, el GeoJSON y el PNG de validación. No se descargan bandas completas.

`RESUME=1` reutiliza registros del mismo `OUTPUT` solo si pasan hash y coinciden geometría, assets y bandera de offset del informe acompañante. Reevalúa cobertura y selección mensual. Las lecturas con errores de red se reintentan una vez antes de probar otra escena. Para rehacer desde cero, no usar `RESUME`.

## Cálculo y controles

1. Reproyecta todos los anillos de EPSG:4326 a la zona UTM WGS84 de la escena con `proj4`.
2. Abre los COG B03/green y B08/nir de 10 m y SCL de 20 m por HTTP Range. Rechaza polígonos parcialmente fuera de escena y bandas B03/B08 desalineadas.
3. Lee únicamente las ventanas necesarias. Evalúa la pertenencia al polígono por centro de píxel y excluye agujeros. Consulta SCL mediante vecino próximo en la posición de cada centro de píxel.
4. Conserva clases SCL 2, 4, 5, 6 y 7; excluye nodata, defectuosos, sombras de nubes, nubes, cirrus y nieve/hielo (0, 1, 3, 8, 9, 10 y 11). No restringe a SCL=6: eso eliminaría superficies que cambian de agua a suelo/vegetación y sesgaría la serie.
5. Aplica escala de reflectancia de los metadatos. Si `earthsearch:boa_offset_applied=true`, no vuelve a aplicar el offset. Si es false, aplica el offset declarado; con metadatos ambiguos falla. Excluye reflectancias negativas, nodata y denominadores no positivos.
6. Promedia `(B03-B08)/(B03+B08)` sobre píxeles válidos, escala una sola vez por 10.000 y guarda `validPixels`. Un AOI sin píxeles válidos produce un fallo explícito.
7. Exige la fracción mínima de píxeles válidos y usa exclusivamente el hash canónico compartido. Un rechazo queda documentado y no produce una medición inventada. Si hay meses sin escena aceptable, la corrida termina con código 1 aun si guardó registros válidos: esto ocurrió en la entrega de 105 mediciones, con tres huecos de calidad explícitos.

Earth Search tiene reportes públicos de inconsistencias históricas en sus offsets. El código sigue la bandera de armonización y conserva metadatos para auditoría; no garantiza que el proveedor esté libre de errores. Revisar escenas sospechosas antes de publicarlas.

## Artefactos

- `sample-data/wetlands.geojson`: tres AOI piloto del Salar del Hombre Muerto, IDs 1..3. Ver `sample-data/AOI.md`.
- `sample-data/stac/wetland-N.json.gz`: items STAC completos obtenidos en la última búsqueda por AOI, comprimidos sin pérdida.
- `sample-data/measurements.json`: serie real para I3; no contiene tx ni implica publicación en Avalanche.
- `sample-data/measurements.report.json`: parámetros, meses sin dato, escenas rechazadas, cobertura válida y procedencia por hash, geometría exacta, SHA-256 del polígono, CRS y metadatos/URLs de bandas. Con otro `OUTPUT`, el informe usa su mismo nombre y sufijo `.report.json`.
- `sample-data/measurements.csv` y `measurements.summary.json`: exportación y resumen auditados por `npm run summary -w @vega/processing`.
- `sample-data/validation/sentinel-aois.png`: color real Sentinel-2 con AOI 1 rojo, 2 cian y 3 amarillo; metadatos en el JSON acompañante. Se reproduce con `npm run preview -w @vega/processing`.

El esquema v1 no incluye el hash de la geometría dentro del registro sellado: el SHA-256 del polígono vive en el informe auxiliar. Conservar y versionar juntos GeoJSON, STAC, registros e informe. Vincular criptográficamente esa geometría al registro requiere una futura versión coordinada del esquema.

## Interpretación y entrega al equipo

**NDWI es un indicador espectral, no volumen de agua ni prueba de contaminación o causa minera.** Las sales, vegetación, turbidez, hielo, estacionalidad y proporción de píxeles válidos afectan la interpretación. `eo:cloud_cover` corresponde a la tesela, no al AOI. Comparar también `validPixels` y `validFraction` entre fechas: aun con el mínimo del 50%, las medias pueden representar distintas partes del área.

Los umbrales 1500/1000/1200 se mantienen para compatibilidad con el deploy del equipo. **Son provisionales y no son umbrales ecológicos calibrados**. La vega vegetada puede presentar NDWI negativo sin implicar una degradación. No ajustar umbrales para fabricar un evento ambiental; acordar su interpretación con I1/I3 antes de la demo.

La inspección visual de AOI se realizó contra Sentinel-2. La comparación numérica de 2-3 fechas con Copernicus Browser y la validación experta de límites/umbrales siguen siendo controles externos pendientes.

## Recalcular un dato (pitch)

1. Buscar `sceneId` en Earth Search y recuperar las bandas indicadas en el informe.
2. Usar el GeoJSON versionado y ejecutar el mismo intervalo con `WETLAND_ID`, siguiendo la máscara y calibración descriptas arriba.
3. Comparar el entero NDWI, `validPixels` y el hash generado por `@vega/shared` con el registro publicado. La coincidencia prueba integridad/reproducción del cálculo; no certifica la verdad del proveedor ni una causa ambiental.

## Fuentes y atribución

- Contains modified Copernicus Sentinel data 2023-2025, processed by Vega. El año de cada escena figura en el registro.
- Earth Search / Element 84, acceso a Sentinel-2 en AWS Open Data: https://github.com/Element84/earth-search
- Lectura COG: https://github.com/geotiffjs/geotiff.js
- Offset y limitaciones conocidas: https://github.com/Element84/earth-search/issues/66 y https://github.com/Element84/earth-search/issues/71
- Contexto del salar: https://science.nasa.gov/earth/earth-observatory/salar-del-hombre-muerto-argentina-38729/ y https://kba.avesargentinas.org.ar/explorar/aica/salar-del-hombre-muerto/
- Digitalización inicial: Esri World Imagery y sus proveedores, inspección visual; no se redistribuye la imagen base de Esri.

Texto para la slide: **Sentinel-2 público → máscara de nubes → NDWI por área fija → registro reproducible → hash sellado por el relayer.** El mapa permite contrastar fechas; el sellado permite detectar cambios posteriores del registro.
