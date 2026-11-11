# AOI piloto: Salar del Hombre Muerto

Se reemplazaron los cuadrados de ejemplo por tres áreas de monitoreo digitalizadas sobre sectores visibles del salar, en Catamarca/Salta. **No son delimitaciones oficiales ni un inventario completo de humedales.** Los nombres describen su ubicación dentro del piloto; no se presentan como topónimos oficiales.

| ID | Área | Motivo de selección | Color en la validación |
|---|---|---|---|
| 1 | Laguna del sector sur | Superficie de agua visible junto al borde sur del salar | Rojo |
| 2 | Laguna del sector central | Sector somero/estacional y borde salino: permite observar variación de superficie | Cian |
| 3 | Vega fluvial oriental | Corredor con vegetación y cauce visible; interpretación diferente de agua abierta | Amarillo |

La digitalización inicial usa Esri World Imagery (fecha de adquisición del mosaico no determinada). Extensión exacta consultada: `[-67.2, -25.50357142857143, -66.8, -25.24642857142857]`, EPSG:4326; metadatos de exportación en `stac/overview-map.json`. Luego se inspeccionaron los polígonos superpuestos sobre color real Sentinel-2 `S2A_19JFM_20240409_0_L2A`: ver `validation/sentinel-aois.png`. La inspección confirma ubicación visual; no certifica límites ecológicos, propiedad ni causalidad de cambios.

El PNG Sentinel se regenera con `npm run preview -w @vega/processing`. Su JSON contiene escena, CRS, extensión y colores. Se mantiene una geometría fija entre fechas para evitar comparar áreas diferentes.

Los IDs y umbrales de integración se mantienen: 1→1500, 2→1000, 3→1200. Su conservación no equivale a validación ambiental: en particular, el NDWI de vegetación puede ser negativo. Revisar con el equipo antes de interpretar `WaterAlert` como degradación.

Contexto geográfico: [Aves Argentinas, Salar del Hombre Muerto](https://kba.avesargentinas.org.ar/explorar/aica/salar-del-hombre-muerto/) y [NASA Earth Observatory](https://science.nasa.gov/earth/earth-observatory/salar-del-hombre-muerto-argentina-38729/).
