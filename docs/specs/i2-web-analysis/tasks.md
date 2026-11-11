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

Pendientes del alcance final: catálogo regional completo, MultiPolygon/mosaicos, secuencia del salar completo, UI, despliegue y publicación. Marcar una tarea solo con evidencia de ejecución.
