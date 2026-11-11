# Tareas y evidencia

- [x] Requisitos del usuario y límites del incremento escritos.
- [x] Plan de módulos e integración escrito.
- [x] Período móvil y ventanas mensuales con pruebas.
- [x] Catálogo parcial y validación de selección/dibujo.
- [x] Motor parametrizado con progreso y salida por trabajo.
- [x] PNG temporales por área con fecha/escena.
- [x] Trabajos persistidos, cola y recuperación.
- [x] HTTP para catálogo, solicitudes, estado, resultado y assets.
- [x] Pruebas de aislamiento, errores, reinicio y solicitud HTTP.
- [x] Prueba acotada contra Sentinel-2 y validación canónica.
- [x] Documentación operativa para Gaby/Sol y reporte de limitaciones.

Evidencia: `npm run typecheck` de los cuatro workspaces y `npm run test -w @vega/processing`: nueve pruebas aprobadas, con HTTP real local y lectura de GeoTIFFs de referencia. Solicitud real AOI 1, 2024-04-01 a 2024-05-01: estado `succeeded`, escena `S2B_19JFM_20240404_0_L2A`, NDWI 0.7795, 15.324 píxeles válidos y cobertura válida 77.83%. PNG consultado por HTTP y revisado visualmente. La exportación pasa el dry-run de I3 (un hash válido, sin enviar transacciones).

Al cierre del primer incremento quedaban pendientes catálogo regional, MultiPolygon/mosaicos y secuencia del salar completo. Se completan en el bloque siguiente. UI, despliegue y publicación se integran con I4/I3.

## Segundo incremento · I2

- [x] Catálogo regional IGN/USGS reproducible y snapshots con hashes: 135 salares/salinas, 506 cuerpos de agua.
- [x] Reunir cortes cartográficos y conservar salares compartidos con un único ID.
- [x] Validar Polygon/MultiPolygon/agujeros, ámbito territorial e identidad canónica.
- [x] Grilla NDWI única, solapamientos sin doble conteo y cruce de zonas UTM.
- [x] Agrupar teselas de la misma adquisición/plataforma, conservar captura inicial/final.
- [x] Generar secuencia con el encuadre del salar completo, además de imágenes por área.
- [x] Anclar geometría nueva en el hash mediante el método v2, manteniendo compatibilidad v1/ABI.
- [x] Caché explícita, cliente para Sol y exportación offline.
- [x] Compatibilidad con `geojson: FeatureCollection` y `salarName` del frontend; alias regionales y geometrías de usuario, sin inventar límites completos de salares desconocidos.
- [x] Pruebas de software y reconstrucción del catálogo sin red.
- [x] Pruebas reales: Olaroz/Jujuy y Arizaro/Salta con una medición, imagen de AOI y mosaico del salar en cada caso.
- [x] Tres años reales en Hombre Muerto: 35 mediciones, 35 imágenes por AOI, 36 mosaicos de salar y un hueco de calidad explícito. Dry-run de I3 validó los 35 hashes; exportación offline verificada.
- [ ] Validar Dockerfile en el entorno de Gaby: Docker no está instalado aquí.

Lo restante de integración pertenece a Sol (UI/playback) y Gaby (hosting/publicación), con coordinación de IDs/umbrales de Igna. La validación ambiental externa no se declara realizada por pruebas de software.

Evidencia versionada: `sample-data/validation/three-year-analysis.json`, `jujuy-analysis.json`, `salta-analysis.json` y `geometry-bound-analysis.json`. La corrida de tres años tardó 1061 segundos en frío y conserva un hueco de calidad; una solicitud idéntica ya calculada devolvió `cacheHit:true`. Doce pruebas aprobadas, incluyendo cambio de zona UTM, agujeros, solapamientos, identidad geométrica, HTTP, caché y bloqueo de directorio. El cliente puede preparar resultados antes de la demo y debe mostrar fecha/caché sin fingir un cálculo instantáneo.
