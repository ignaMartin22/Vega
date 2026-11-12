# SATY — entrega y operación del frontend

## Estado de integración (11/11/2026)

La landing, el flujo de análisis y la verificación on-chain están integrados en main. El backend I2 incorporó catálogo regional, selección de áreas, geometrías Polygon/MultiPolygon con agujeros, mosaicos de teselas y fotogramas de evolución. Los cambios del catálogo y mosaicos de i2/sdd-sentinel2 también están integrados.

Índice: [estado integral](PROJECT_STATUS.md) · [pitch y guion de demo](PITCH_DEMO.md) · [API de procesamiento](../processing/API.md).

## Qué está disponible

- Landing institucional responsive y plataforma interactiva en frontend/.
- API local en processing/: catálogo regional, consulta de salares/cuerpos de agua, solicitudes asíncronas, progreso, resultados, mediciones, incidencias y PNGs.
- Catálogo documentado: 135 entradas de salares/salinas y 506 cuerpos de agua cartografiados. La cobertura es respecto de las capas IGN/USGS usadas; no representa un inventario ecológico exhaustivo.
- Motor Sentinel-2 con STAC paginado, selección mensual y mosaicos de teselas de la misma adquisición/plataforma dentro de una ventana de 15 minutos.
- Cálculo NDWI en grilla UTM WGS84 de 10 m, máscara SCL y control de píxeles válidos. El método mosaic-v2 compromete la geometría canónica en el hash.
- Contrato VegaRegistry desplegado en Fuji y componente frontend para contrastar el registro off-chain con hash/campos on-chain.
- Relayer con validación de hash, deduplicación, historial acumulado, registros records.json, filtros --only-wetland/--limit y reintentos RPC.

## Límites distintos entre la interfaz y la API

La importación web actual (frontend/src/data/analysis-geojson.ts) acepta FeatureCollection de 1 a 5 Features Polygon simples, un único anillo exterior, 4–501 posiciones por anillo, coordenadas WGS84 y archivo máximo de 5 MiB.

La API I2 es más amplia: acepta áreas Polygon/MultiPolygon con agujeros válidos, hasta 20.000 coordenadas y 250 km² por área dibujada; admite hasta cinco áreas. La compatibilidad GeoJSON FeatureCollection por la API tiene límite de cuerpo de 4 MiB. Para usar geometrías que la interfaz aún no admite, se puede llamar la API directamente conforme a processing/API.md.

El servicio limita el ámbito a Salta, Jujuy y Catamarca y al entorno de monitoreo del salar seleccionado. Para salares no catalogados permite áreas de usuario dentro de la región, pero no inventa ni certifica un contorno oficial. El entorno de consulta de 15 km es un rectángulo operativo, no una cuenca hidrográfica.

## Ejecutar localmente

Requisitos: Node.js 22 y npm. Desde la raíz:

Terminal 1 — servicio de análisis:

```bash
npm ci
npm run serve -w @vega/processing
```

Terminal 2 — frontend:

```bash
npm run dev:front
```

Vite suele escuchar en http://localhost:5173; la API local en http://127.0.0.1:8787. La interfaz usa por defecto esa API local. Para cambiarla, definir VITE_ANALYSIS_API_URL en el entorno de Vite o en el .env de la raíz (frontend/vite.config.ts usa envDir: "..").

Comprobaciones desde la raíz:

```bash
npm run typecheck
npm test -w @vega/frontend
npm test -w @vega/processing
npm test -w @vega/relayer
npm run build -w @vega/frontend
```

El CI de los PR integrados ejecutó sus comprobaciones correspondientes; eso no sustituye una prueba manual del flujo completo en navegador.

## Datos y Avalanche

- El frontend inicia en modo mock salvo que se configure VITE_DATA_SOURCE=chain.
- En modo chain, lee VegaRegistry en Fuji y busca el registro off-chain en VITE_RECORDS_URL (por defecto /records.json).
- Contrato: 0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5; red Fuji C-Chain, Chain ID 43113.
- La serie sample-data/measurements.json contiene 105 registros experimentales para tres AOI del piloto Hombre Muerto (2023–2025). Los hashes fueron validados en dry-run; esto no significa que estén publicados.
- El repositorio revisado no contiene sample-data/published.json ni frontend/public/records.json. No afirmar que la serie esté sellada ni que la verificación de esos registros esté demostrada.
- docs/AVANCES.md registra que la wallet pública del relayer fue autorizada por I1. Antes de transmitir, confirmar el estado actual del publisher, IDs, geometrías y umbrales con el equipo.
- No ejecutar el relayer con mocks ni con la serie experimental sin aprobación expresa del responsable de datos/contratos.

## Procesamiento: alcance y cautelas

- Se consultan escenas Sentinel-2 L2A y se agrupan teselas de la misma adquisición/plataforma con diferencia máxima de 15 minutos; no se mezclan días distintos para fingir una captura.
- El mosaico usa grilla de 10 m, calibración/offset del proveedor, máscara SCL y resolución estable de solapamientos. Se exige al menos 50% de centros de píxel válidos por AOI.
- El servicio trabaja con 36 ventanas mensuales para el período predeterminado de tres años. Puede devolver partial o no_data; no_data significa datos insuficientes, no ausencia de agua.
- Las secuencias frames corresponden a cada humedal; salarFrames corresponde al encuadre del salar completo y exige cobertura visual del 90%.
- NDWI es un indicador espectral, no mide directamente volumen de agua ni prueba contaminación, degradación o causalidad minera.
- Los umbrales 1500/1000/1200 heredados del contrato no son umbrales ecológicos calibrados.
- Los AOI de sample-data/wetlands.geojson son áreas piloto digitalizadas e inspeccionadas, no límites oficiales. Para Tocomar hace falta recuperar y validar el vector de fuente; no reconstruirlo a partir de un punto.

## Despliegue remoto

No hay un despliegue público confirmado. Publicar el frontend estático no despliega el backend.

1. Acordar el entorno y responsable de operación del backend.
2. Desplegar processing con HTTPS, almacenamiento persistente para ANALYSIS_DATA_DIR y una instancia por directorio.
3. Configurar ALLOWED_ORIGINS con el origen exacto del frontend.
4. Configurar VITE_ANALYSIS_API_URL con la URL HTTPS real del backend antes del build.
5. Configurar el hosting del monorepo para instalar desde la raíz, ejecutar npm run build -w @vega/frontend y publicar frontend/dist.
6. Probar desde otra red/dispositivo: catálogo, carga, POST, progreso, resultado, imágenes, errores y CORS.

No colocar URL ficticia ni secretos en el repositorio. PRIVATE_KEY debe permanecer en el entorno seguro del relayer; nunca en variables VITE_*.

## Pendientes para cerrar la demo

- [ ] Ejecutar frontend y API juntos y recorrer el flujo en navegador.
- [ ] Contrastar 2–3 fechas NDWI con Copernicus Browser y registrar diferencias.
- [ ] Validar con especialistas la geometría del AOI que se presentará y los umbrales.
- [ ] Recuperar el vector fuente de Tocomar si se elige esa vega.
- [ ] Aprobar el conjunto de registros y publicar una muestra pequeña; verificar transacción y evento en Fuji.
- [ ] Generar published.json y records.json solo desde publicaciones reales.
- [ ] Desplegar backend y frontend en un entorno autorizado y probar preview.
- [ ] Grabar video demo y completar atribución.
