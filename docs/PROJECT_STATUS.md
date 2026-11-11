# Estado integral del proyecto Vega

**Corte de revisión:** 11 de noviembre de 2026  
**Repositorio:** `ignaMartin22/Vega` · rama principal `main`  
**Commit revisado:** `91aae6b6f6d1b95816afdf94f58793f31fa921e3`

Este documento distingue código integrado, evidencia disponible y tareas que todavía requieren ejecución o validación humana. No debe interpretarse como certificación científica ni como confirmación de despliegue.

## 1. Integración GitHub

- PR #5, #6, #7, #8, #9 y #10 están integrados en `main`.
- PR #1–#4 se cerraron como reemplazados o ya cubiertos.
- En la revisión del 11/11 no había PR abiertos ni issues abiertos.
- Los checks de CI asociados a las integraciones de frontend y processing finalizaron correctamente. La aprobación del CI no sustituye una prueba manual del producto.

## 2. Componentes disponibles

| Componente | Estado comprobado | Qué falta |
|---|---|---|
| Contrato VegaRegistry | Desplegado en Avalanche Fuji; dirección en `shared/deployments/fuji.json` | Confirmar publicaciones reales de la serie elegida y guardar evidencia de eventos |
| Procesamiento Sentinel-2 | Motor NDWI, STAC paginado, selección mensual, servicio HTTP y entrada GeoJSON configurable | Mosaicos, catálogo regional, validación científica externa |
| Frontend | Landing, mapa, importación GeoJSON, panel de análisis, visualización de resultados y verificación on-chain | Prueba manual integral y datos reales publicados |
| GeoJSON personalizado | Validación en frontend/API y búsqueda STAC por geometría | No certifica la identidad territorial del polígono |
| Relayer | Valida hashes, evita duplicados y puede generar archivos de publicación y verificación | Ejecutar publicación aprobada; no se encontraron artefactos versionados de publicaciones reales |
| Infraestructura | Instrucciones locales documentadas | Backend y frontend públicos aún no confirmados |
| Pitch y demo | Mensaje del proyecto y arquitectura documentados en README | Deck final y video demo pendientes |

## 3. Evidencia de datos disponible

El repositorio contiene:

- `sample-data/measurements.json`: 105 registros experimentales Sentinel-2 para tres AOI del piloto Salar del Hombre Muerto, período 2023–2025.
- `sample-data/measurements.report.json`, resúmenes y CSV: procedencia y controles de la serie.
- `sample-data/stac/`: respuestas STAC guardadas.
- `sample-data/validation/sentinel-aois.png`: inspección visual de los AOI sobre Sentinel-2.
- `sample-data/wetlands.geojson`: tres AOI piloto, expresamente no oficiales.

El handoff de I2 informa hashes válidos y tres meses sin observación aceptable. Los registros son evidencia experimental reproducible, pero no se debe decir que están publicados en Avalanche: al revisar `main` no existían `sample-data/published.json` ni `frontend/public/records.json`.

## 4. Bloqueos que requieren decisión del equipo

1. **Geometría del piloto:** las tres áreas del GeoJSON actual son AOI digitalizadas, no límites oficiales. Para usar Tocomar/Olaroz se debe obtener la geometría original del inventario científico y validarla; el punto y la superficie publicados no alcanzan para reconstruir un polígono.
2. **Umbrales:** el contrato conserva 1500/1000/1200 (NDWI × 10.000). Son valores de integración, no umbrales ecológicos calibrados. La vegetación puede dar NDWI negativo sin indicar degradación.
3. **Publicación:** antes de transmitir, I1/I2/I3 deben aprobar geometría, wetlandId, umbral, conjunto de registros y wallet publicadora. No publicar mocks ni datos de otra geometría.
4. **Cobertura:** el servicio requiere cobertura completa del AOI en una sola tesela/escena aceptada. No realiza mosaico multi-tesela y el catálogo no es regional completo.
5. **Infraestructura:** el backend HTTP necesita almacenamiento persistente, HTTPS y CORS. El hosting estático del frontend no despliega el backend.
6. **Prueba de producto:** no hay evidencia de una prueba manual de extremo a extremo en navegador ni de un deployment público.

## 5. Orden recomendado para cerrar la entrega

### P0 — Validar producto local

- [ ] Instalar con Node.js 22: `npm ci`.
- [ ] Terminal 1: `npm run serve -w @vega/processing`.
- [ ] Terminal 2: `npm run dev:front`.
- [ ] Abrir `http://localhost:5173` y recorrer importación GeoJSON → análisis → progreso → resultados → imágenes.
- [ ] Probar también errores: GeoJSON inválido, sin cobertura, sin datos y API apagada.
- [ ] Guardar capturas y anotar cualquier error reproducible.

### P1 — Validar dato y área

- [ ] Contrastar 2–3 fechas y píxeles/NDWI con Copernicus Browser.
- [ ] Obtener la fuente vectorial de Tocomar o confirmar otro polígono con responsable científico.
- [ ] Validar topología, CRS, superficie, límites y correspondencia geográfica.
- [ ] Acordar umbrales y reglas de alerta con I1/I2/I3.

### P2 — Demostrar blockchain

- [ ] Elegir únicamente registros aprobados y ejecutar primero dry-run.
- [ ] Confirmar wallet publicadora, permisos, IDs y umbrales en Fuji.
- [ ] Publicar una muestra pequeña aprobada; revisar cada transacción y evento.
- [ ] Confirmar al menos un `WaterAlert` real y guardar la URL del explorer.
- [ ] Versionar `sample-data/published.json` y `frontend/public/records.json` con datos reales, sin secretos.

### P3 — Preview y presentación

- [ ] Acordar entorno y responsable de operación del backend.
- [ ] Desplegar backend persistente con HTTPS y CORS restringido.
- [ ] Configurar `VITE_ANALYSIS_API_URL` con la URL real antes del build.
- [ ] Crear preview del frontend y probarlo desde otro dispositivo/red.
- [ ] Preparar pitch de 5–7 diapositivas y video de 1–3 minutos con una transacción verificable.
- [ ] Actualizar README con URLs reales y atribución.

## 6. Comandos de comprobación

Desde la raíz:

```bash
npm ci
npm run typecheck
npm test -w @vega/frontend
npm test -w @vega/processing
npm run build -w @vega/frontend
```

Para el servicio local:

```bash
npm run serve -w @vega/processing
npm run dev:front
```

Para validar los registros históricos sin transmitir:

```bash
MEASUREMENTS=sample-data/measurements.json npm run dry -w @vega/relayer
```

En PowerShell:

```powershell
$env:MEASUREMENTS='sample-data/measurements.json'
npm run dry -w @vega/relayer
```

**Importante:** `dry` valida hashes; no publica ni demuestra que haya ocurrido una transacción. La publicación real requiere autorización expresa del equipo y secretos locales seguros.

## 7. Límites de comunicación

- NDWI es un indicador espectral; no mide directamente volumen de agua ni prueba contaminación o causalidad minera.
- Una coincidencia de hash prueba integridad del registro respecto de los campos hasheados; no certifica por sí sola la calidad de la escena ni la verdad de la interpretación.
- Un polígono GeoJSON aceptado por el software no es automáticamente un límite oficial.
- No presentar datos mock, umbrales placeholder o AOI no validados como resultados ambientales confirmados.
