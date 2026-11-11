# Entrega y operación del frontend de Vega

## Estado de integración (11/11/2026)

La landing y el flujo de análisis están integrados en `main` mediante los PR #7 y #8. El contrato de API para GeoJSON personalizado está integrado mediante el PR #6. La verificación de integridad on-chain del frontend está integrada mediante el PR #9; la entrada GeoJSON configurable y la consulta STAC espacial del pipeline CLI, mediante el PR #10.

Esta documentación describe el estado actual de `main`; no es necesario integrar esos PR nuevamente.

## Qué funciona en el repositorio

- Landing institucional responsive y plataforma interactiva en `frontend/`.
- Importación de GeoJSON desde la interfaz, validación y envío a `POST /api/analyses`.
- Seguimiento de trabajos, resultados NDWI, incidencias y fotogramas Sentinel-2.
- Servicio HTTP local de procesamiento con estado persistido y endpoint de salud.
- Entrada GeoJSON configurable para el pipeline CLI mediante `WETLANDS_GEOJSON`.
- Consulta STAC espacial con la geometría completa (`intersects`), paginación y selección mensual.
- Contrato `VegaRegistry` desplegado en Fuji y botón de verificación de registro/hash/campos.

## Ejecutar localmente

Requisitos: Node.js 22 y npm. Desde la raíz del repositorio:

Terminal 1 — servicio de análisis:

```bash
npm ci
npm run serve -w @vega/processing
```

Terminal 2 — frontend:

```bash
npm run dev:front
```

Vite suele escuchar en `http://localhost:5173`; la API local escucha en `http://127.0.0.1:8787`.

La interfaz usa por defecto `http://127.0.0.1:8787`. Para cambiar el origen, definir `VITE_ANALYSIS_API_URL` en el entorno de Vite o en el `.env` de la raíz (el `vite.config.ts` de frontend configura `envDir: ".."`).

Comprobaciones:

```bash
npm run typecheck
npm test -w @vega/frontend
npm test -w @vega/processing
npm run build -w @vega/frontend
```

El CI de los PR integrados ejecutó las comprobaciones correspondientes. Eso no reemplaza la prueba manual del flujo completo en navegador.

## Fuente de datos y estado de Avalanche

- El frontend arranca en modo `mock` si no se configura `VITE_DATA_SOURCE=chain`.
- En modo `chain`, lee `VegaRegistry` en Fuji y busca el registro off-chain en `VITE_RECORDS_URL` (por defecto `/records.json`).
- Dirección del contrato: `0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5`; red Fuji C-Chain, Chain ID 43113.
- La serie histórica `sample-data/measurements.json` contiene 105 registros experimentales Sentinel-2 para tres AOI del piloto Hombre Muerto (2023–2025). Su handoff documenta hashes válidos y huecos de cobertura.
- La existencia de esa serie no demuestra que se haya publicado en Fuji. En el estado revisado no están versionados `sample-data/published.json` ni `frontend/public/records.json`; por lo tanto, no afirmar que la serie esté sellada ni que la verificación de esos registros esté lista.
- No ejecutar el relayer con mocks ni con la serie experimental sin aprobación explícita del equipo responsable de IDs, geometrías y umbrales.

## Despliegue remoto

No hay un despliegue público confirmado. Publicar solamente el frontend Vite no despliega el servicio de procesamiento.

Para una demo remota:

1. Acordar con el responsable de infraestructura dónde operar el servicio I2 y dónde persistir `ANALYSIS_DATA_DIR`.
2. Desplegar el backend con HTTPS, almacenamiento persistente y una sola instancia por directorio de datos.
3. Configurar `ALLOWED_ORIGINS` con el origen exacto del frontend.
4. Configurar `VITE_ANALYSIS_API_URL` con la URL HTTPS real del backend antes del build.
5. Configurar el hosting del monorepo para instalar desde la raíz, ejecutar `npm run build -w @vega/frontend` y publicar `frontend/dist`.
6. Probar en preview la carga GeoJSON, POST, seguimiento, resultado, imágenes y errores antes de compartir el enlace.

No colocar una URL ficticia ni publicar una clave privada. `PRIVATE_KEY` debe permanecer en el entorno seguro del relayer; nunca en variables `VITE_*`.

## Límites científicos y funcionales

- El importador acepta FeatureCollection con 1–5 polígonos simples, WGS84, un anillo exterior y un área menor a 100 km². MultiPolygon y agujeros no están soportados en este flujo.
- El servicio no certifica que el polígono aportado pertenezca al salar nombrado.
- El cálculo actual exige que cada AOI esté completamente cubierto por una única escena/tesela aceptada. No hay mosaico multi-tesela; puede devolver cobertura insuficiente, `partial` o `no_data`.
- La API documenta un catálogo piloto parcial: Hombre Muerto; no equivale a catálogo regional completo para Salta, Jujuy y Catamarca.
- Los AOI de `sample-data/wetlands.geojson` son áreas piloto digitalizadas e inspeccionadas visualmente, no límites oficiales. No corresponden a la vega Tocomar seleccionada como alternativa científica.
- Los umbrales 1500/1000/1200 son valores de integración heredados del contrato; no están calibrados como umbrales ecológicos. NDWI no demuestra contaminación, degradación ni causalidad minera.
- Las áreas personalizadas reciben IDs provisionales. No se publican automáticamente en Avalanche.

## Pendientes para cerrar la demo

- [ ] Ejecutar backend y frontend localmente y recorrer el flujo completo en navegador.
- [ ] Contrastar numéricamente 2–3 escenas NDWI con Copernicus Browser y registrar diferencias.
- [ ] Validar con el equipo la geometría oficial/origen de cada AOI y los umbrales.
- [ ] Recuperar y validar el polígono fuente de la vega Tocomar antes de usarla como piloto; no dibujar un polígono a partir de un punto o superficie publicada.
- [ ] Revisar con I1/I2/I3 la selección de registros y publicar únicamente mediciones aprobadas.
- [ ] Confirmar una transacción y un evento `WaterAlert` reales en Fuji; guardar links de explorer y respaldos.
- [ ] Generar `published.json` y `frontend/public/records.json` a partir de publicaciones reales, nunca de mocks.
- [ ] Desplegar backend y frontend en un entorno autorizado y probar preview.
- [ ] Completar pitch deck, video demo y atribución final.

