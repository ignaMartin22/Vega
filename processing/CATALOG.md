# Catálogo regional

Fuentes:

- IGN WFS: https://wms.ign.gob.ar/geoserver/ows ; documentación: https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/ServiciosOGC . Capas: `provincia`, `edafologia_salina`, `areas_de_aguas_continentales_intermitente`, `areas_de_aguas_continentales_perenne`.
- USGS: Mihalasky et al., 2020, *Lithium Occurrences and Processing Facilities of Argentina, and Salars of the Lithium Triangle, Central South America*, https://doi.org/10.5066/P9RLUH4F . Polígonos derivados de imágenes 2018–2019; no describen la superficie de agua actual.
- Distribución ArcGIS usada: https://services9.arcgis.com/DeJOjr4rpbUboAGS/ArcGIS/rest/services/Salares/FeatureServer/0 . ScienceBase rechazó la descarga original con 403; el distribuidor no se presenta como autor. Se conserva el snapshot.

El inventario contiene salares/lagunas, salinas/salitres/borateras sin nombre. Se muestran identificadores de fuente, sin inventar topónimos. La cobertura es completa respecto de las capas/snapshot consultados; no un inventario ecológico exhaustivo. Vegas sin polígonos de agua pueden seleccionarse por dibujo.

## Criterios

1. Descargar todas las páginas y rechazar respuestas truncadas.
2. Clasificar provincias por intersección geométrica. Límites provinciales simplificados a 0.0001 grados para operación, originales archivados. No es un deslinde legal de precisión.
3. Reunir partes IGN contiguas del mismo nombre, dentro de 0.005 grados; conservar IDs de origen. No agrupar homónimos alejados.
4. Priorizar IGN, complementar USGS y deduplicar por nombre/sinónimos y bbox superpuestos o IoU de bbox >0.8. Casos cartográficamente ambiguos requieren revisión.
5. Asociar cuerpos de agua al rectángulo del salar ampliado aproximadamente 15 km. Es entorno de consulta, **no cuenca hidrográfica ni pertenencia ecológica/jurídica**.
6. Exportar geometrías, provincias, fuentes, fecha y hashes de snapshots. No derivar umbrales ambientales de una costra salina.

## Actualización

Desde la raíz con Node 22: `npm run catalog:refresh -w @vega/processing`. Requiere red y regenera catálogo/snapshots. Revisar cambios, conteos y pruebas antes de publicar.

Reconstrucción sin red: `npm run catalog:build -w @vega/processing`. Usa `.json.gz` versionados. Las descargas temporales solo se usan con `CATALOG_USE_DOWNLOADS=1`, configurado por refresh; la reconstrucción normal no depende de archivos temporales del equipo.
