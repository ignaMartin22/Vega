# Pitch y guion de demo de Vega

Documento de trabajo para el equipo. Está redactado para presentar lo que existe hoy sin convertir hipótesis, AOI exploratorios o mediciones no publicadas en resultados certificados.

## Pitch de 6 diapositivas

### 1. El problema: el agua necesita evidencia independiente

**Título:** ¿Quién verifica cómo cambia el agua en los salares?

- En la Puna, los humedales sostienen ecosistemas y comunidades mientras conviven con actividades productivas intensivas en agua.
- La información ambiental suele estar dispersa y no siempre es sencilla de reproducir o contrastar.
- Comunidades, organismos públicos, empresas y compradores necesitan una base común de evidencia.

**Frase oral:** “Vega busca que una observación ambiental pueda ser revisada por cualquiera, no que dependa de confiar ciegamente en quien la presenta”.

**Visual:** mapa de la Puna con salares y humedales; usar una cartografía atribuida y no marcar polígonos exploratorios como límites oficiales.

### 2. La propuesta: del satélite a un registro verificable

**Título:** Una cadena de evidencia abierta y auditable

1. Sentinel-2 aporta imágenes públicas.
2. Vega localiza escenas y calcula NDWI sobre áreas de interés.
3. Cada registro conserva fecha, escena, método y hash.
4. Una vez aprobado por el equipo, el relayer puede registrar el hash y los campos acordados en Avalanche Fuji.
5. El frontend permite consultar y contrastar el registro.

**Visual:** Sentinel-2 → STAC/COG → NDWI → revisión humana → relayer → VegaRegistry → verificación.

**Frase oral:** “La cadena no reemplaza la ciencia: deja una huella verificable de qué dato se decidió registrar”.

### 3. Lo que ya procesamos

**Título:** Una primera serie experimental sobre el Salar del Hombre Muerto

- 105 registros Sentinel-2 L2A entre 2023 y 2025.
- Tres áreas piloto (AOI) con series separadas.
- Selección mensual de escenas, control de nubosidad y máscara SCL.
- Se excluyeron observaciones que no superaron el control de cobertura válida; no se interpolaron meses sin datos.
- Los registros incluyen identificador de escena, fecha, píxeles válidos y hash.

**Advertencia visible:** las tres áreas son AOI digitalizadas e inspeccionadas visualmente; no son límites oficiales de humedales. La serie es experimental y no debe presentarse como monitoreo oficial.

**Visual:** sample-data/validation/sentinel-aois.png y una gráfica generada desde sample-data/measurements.json. Acompañar la gráfica con su período, AOI y cobertura válida.

### 4. Cómo se reproduce una observación

**Título:** De una escena pública a un valor auditable

- Índice utilizado: NDWI = (B03 − B08) / (B03 + B08).
- B03 (verde) y B08 (infrarrojo cercano) de Sentinel-2 L2A.
- Máscara de calidad con SCL y cálculo sobre los píxeles válidos dentro del AOI.
- Se guarda el sceneId, timestamp, nubosidad, cantidad de píxeles válidos, método y hash canónico.
- Otra persona puede recuperar la escena y el polígono versionado para contrastar el cálculo.

**Límite:** NDWI es un indicador espectral; no mide directamente volumen de agua y no demuestra contaminación, degradación ni causalidad minera.

**Visual:** recorte de una escena Sentinel-2, polígono AOI y fórmula. No usar una imagen ilustrativa como si fuera un resultado calculado.

### 5. Qué aporta Avalanche

**Título:** Integridad y trazabilidad después de la revisión

- El contrato VegaRegistry está desplegado en Avalanche Fuji C-Chain.
- Dirección: 0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5.
- El contrato registra mediciones autorizadas, evita repetir el mismo hash y emite WaterAlert cuando el valor queda por debajo de un umbral configurado.
- El botón de verificación del frontend compara el registro off-chain con el hash y los campos leídos de la cadena.

**Estado que debe decirse con honestidad:** el contrato está desplegado, pero el repositorio revisado todavía no contiene los artefactos published.json y records.json que probarían la publicación de esta serie experimental. No afirmar que las 105 mediciones están selladas ni mostrar una alerta como real hasta confirmar la transacción y el evento en Fuji.

**Visual:** explorer del contrato. Si el equipo completa una publicación aprobada, reemplazar esta diapositiva con el enlace a la transacción real y el evento WaterAlert.

### 6. Próximo hito

**Título:** De un piloto reproducible a una herramienta confiable

- Validar con especialistas los límites de los humedales y los umbrales.
- Completar pruebas comparativas de NDWI contra Copernicus Browser.
- Publicar una muestra aprobada y verificar su transacción en Fuji.
- Desplegar backend y frontend con infraestructura autorizada.
- Ampliar gradualmente el catálogo y resolver mosaicos de teselas para AOI que crucen coberturas.

**Cierre:** “Vega convierte observaciones satelitales abiertas en evidencia ambiental reproducible y, cuando se aprueba, verificable en una red pública”.

---

## Guion de video demo (1:45–2:15)

Grabar solo después de comprobar localmente el flujo de interfaz. Si el backend o la red no están disponibles, mostrar capturas identificadas como tales y no simular una transacción.

| Tiempo | Imagen | Narración / acción |
|---|---|---|
| 0:00–0:15 | Mapa de la Puna y vista de un humedal | “En los salares altoandinos, contar con información ambiental reproducible es clave para comunidades, organismos y actividades productivas”. |
| 0:15–0:30 | Landing de Vega | “Vega conecta imágenes públicas Sentinel-2, análisis NDWI y una capa de trazabilidad verificable”. |
| 0:30–0:55 | Importación GeoJSON y panel de análisis | Mostrar un GeoJSON de prueba validado, iniciar el análisis y esperar el estado terminal. Identificar el AOI como exploratorio si no tiene validación oficial. |
| 0:55–1:15 | Tabla de resultados y fotogramas | Mostrar fecha, NDWI, escena e incidencias. Explicar que los huecos de datos se conservan y no se rellenan. |
| 1:15–1:35 | Código/procedencia y contrato Fuji | Mostrar dirección del contrato y explicar el hash. No decir que la serie está on-chain si no se ha publicado. |
| 1:35–1:55 | Verificación del registro | Solo si existe una medición publicada y su archivo off-chain correspondiente: ejecutar “Verificar” y mostrar coincidencia. Si no, omitir esta acción y mostrar la verificación como funcionalidad preparada, no como resultado demostrado. |
| 1:55–2:10 | Próximos pasos | “El siguiente paso es validar las geometrías y umbrales con el equipo, publicar una medición aprobada y desplegar el servicio para que otros puedan reproducirlo”. |

## Checklist antes de grabar

- [ ] Ejecutar npm ci.
- [ ] Iniciar API con npm run serve -w @vega/processing.
- [ ] Iniciar frontend con npm run dev:front.
- [ ] Probar importación, análisis, progreso, resultados, imágenes y errores en navegador.
- [ ] Preparar un GeoJSON cuya procedencia y alcance estén explicados.
- [ ] Confirmar que las gráficas y tablas corresponden al AOI mostrado.
- [ ] Si se muestra Avalanche: verificar hash, campos, transacción y evento directamente en Fuji.
- [ ] Si se muestra WaterAlert: comprobar el umbral vigente y explicar que no es diagnóstico ecológico por sí solo.
- [ ] Ocultar notificaciones y secretos; no mostrar .env, claves privadas ni tokens.
- [ ] Guardar una captura offline de respaldo y atribuir Sentinel-2/Copernicus, Earth Search/Element 84 y cartografía utilizada.

## Datos que el equipo debe completar antes de la versión final

- Geometría fuente validada del humedal que se presentará (si se usa Tocomar, obtener el vector original del inventario; no derivarlo de un punto).
- Identificación de AOI, superficie, CRS y responsable de validación.
- Comparación de 2–3 fechas contra Copernicus Browser.
- Umbral aprobado, responsable y justificación.
- Hash, transaction hash, bloque y link de explorer de una publicación real, si se completa.
- URL de preview y backend, si se despliegan.
- Atribución final de todas las capas e imágenes.
