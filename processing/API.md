# I2 · Servicio de análisis Sentinel-2

Implementa selección regional, geometrías dibujadas, análisis de tres años e imágenes de evolución. La interfaz visual y reproducción pertenecen a Sol; el despliegue y publicación en Avalanche, a Gaby. Este servicio no envía transacciones.

## Ejecutar

Node 22; desde la raíz del monorepo:

```powershell
npm ci
npm run serve -w @vega/processing
```

API local: `http://127.0.0.1:8787`. Configuración: `HOST`, `PORT`, `ANALYSIS_DATA_DIR`, `ANALYSIS_CONCURRENCY` (1–4; defecto 1) y `ALLOWED_ORIGINS` (lista separada por coma; defecto localhost/127.0.0.1:5173). Mantener una sola instancia por directorio: el lock impide compartirlo accidentalmente. El directorio predeterminado `processing/runtime/` está ignorado por Git. Resultados y registro de IDs sobreviven reinicios; un trabajo interrumpido se marca como tal y puede solicitarse nuevamente.

Gaby puede usar `docker build -f processing/Dockerfile -t vega-processing .` desde la raíz y montar un volumen en `/data`. El Dockerfile se entrega como configuración de despliegue; su ejecución requiere Docker instalado. No copiar `.env`, claves ni runtime al repositorio. El contenedor escucha en 8787 y tiene `/health`.

## Operaciones

| Método/ruta | Resultado |
|---|---|
| `GET /health` | Disponibilidad y definición de cobertura del catálogo |
| `GET /api/salars?province=jujuy` | Catálogo filtrado: ID, nombre, provincias, bbox y fuente |
| `GET /api/salars/:id` | Geometría del salar y entorno de consulta |
| `GET /api/salars/:id/wetlands` | Cuerpos de agua seleccionables asociados a ese entorno |
| `POST /api/analyses` | 202 con `analysisId`, período resuelto y URL de estado; 200 para reutilización de resultado |
| `GET /api/analyses/:id` | Estado, fase, avance y error si corresponde |
| `GET /api/analyses/:id/result` | Mediciones, procedencia, incidencias y secuencias temporales |
| `GET /api/analyses/:id/measurements` | Array canónico compatible con el relayer; no publica |
| `GET /api/analyses/:id/assets/:frameId.png` | Fotograma georreferenciado |

Ejemplo para comenzar con los AOI históricos de Hombre Muerto:

```json
{"salarId":"hombre-muerto","wetlandIds":[1]}
```

Sin fechas, se resuelven los tres años calendario anteriores a la solicitud, con ajuste de 29 de febrero y 36 ventanas mensuales contiguas. Las ventanas son [inicio, fin); no se repiten capturas en sus bordes. Puede enviarse `from` y `to` ISO UTC para un intervalo menor, por ejemplo `2024-04-01` y `2024-05-01` para una prueba breve. No se admiten fechas futuras ni intervalos mayores a tres años.

También admite `areas: [Feature<Polygon|MultiPolygon>]`, con agujeros válidos, además de/o en lugar de `wetlandIds`. Máximo cinco áreas; contornos cerrados sin autointersecciones, hasta 20.000 coordenadas y 250 km² por área dibujada. Las áreas deben quedar en la unión territorial de Salta/Jujuy/Catamarca y el entorno declarado del salar. Geometrías equivalentes por orientación, vértice inicial y orden de partes reciben la misma identidad canónica. La resolución de la geometría canónica es 7 decimales geográficos.

Compatibilidad con la rama GeoJSON de Sol: se admite `geojson: {type: "FeatureCollection", features: [...]}` en lugar de `areas`, con un cuerpo máximo de 4 MiB. No enviar ambos campos. Se puede enviar `salarName` junto con un slug propio: si nombre y ubicación identifican una entrada del catálogo, se resuelve su ID canónico. Para un salar no catalogado se validan igualmente las áreas dentro de las tres provincias; se informa `boundaryKind: user_selection` y no se inventa un contorno completo. En ese caso se entregan imágenes por humedal y una incidencia explicativa. Para aportar también el contorno completo, enviar `salarGeometry` como Polygon/MultiPolygon; queda identificado como geometría del usuario, sin validación cartográfica oficial.

Los IDs de dibujo se reservan persistentemente en un rango separado, por salar + geometría canónica (la misma área en otro salar recibe otro ID), y siguen sujetos a coordinación con Igna antes de configurar umbrales/publicación. No aceptar del navegador un ID on-chain arbitrario. El servicio indica `identityStatus` y `publication.reviewRequired:true`; cero en `thresholdNdwi` no es una calibración ambiental.

El CLI (`npm run ndwi`) también acepta `WETLANDS_GEOJSON=ruta.geojson` con Polygon o MultiPolygon; sin la variable usa `sample-data/wetlands.geojson`.

## Catálogo y fuentes

El snapshot contiene 135 entradas regionales de salares/salinas y 506 cuerpos de agua cartografiados. Incluye nombres desconocidos identificados por fuente. `coverage.complete` significa completo respecto de las capas y el snapshot consultados, **no un inventario ecológico exhaustivo de humedales naturales**. Vegas/bofedales sin polígono de agua pueden dibujarse.

Fuentes: IGN (salinas, provincias y cuerpos de agua perennes/intermitentes), complementado por la distribución ArcGIS del inventario USGS 2020, DOI `10.5066/P9RLUH4F`. Las provincias se obtienen por intersección geométrica, no solo por el texto del inventario ni por el centroide. Los salares compartidos mantienen una identidad. Las partes IGN contiguas con igual nombre se reúnen; se conservan los IDs de fuente. La deduplicación de distribuciones cartográficas usa nombre/sinónimos y solapamiento de bbox; no equivale a un deslinde legal.

Las geometrías provinciales se simplifican a 0.0001 grados para operación; fuentes originales comprimidas y hashes quedan en `sample-data/catalog-sources/`. El entorno de consulta es el rectángulo envolvente del salar ampliado aproximadamente 15 km: **no representa una cuenca hidrográfica**. Los límites originales del salar permanecen disponibles para el encuadre y su procedencia.

`processing/data/manifest.json` describe fuentes, conteos y snapshots. `processing/scripts/build-catalog.ts` regenera el catálogo desde los snapshots comprimidos (o las descargas temporales originales). Para actualizar fuentes ver `CATALOG.md`. No requiere credenciales ni acceso satelital para listar/seleccionar zonas.

## Motor y estado

Estados: `queued → running → succeeded | partial | no_data | failed`. Un resultado parcial informa cada ventana o imagen faltante. `no_data` significa datos insuficientes, nunca “no hay agua”. Fallos de búsqueda, raster o imágenes son distintos de falta de datos. La publicación permanece `not_requested`.

Se consultan escenas L2A con nubosidad declarada menor al 20%. Se agrupan teselas de la misma adquisición/plataforma, con un intervalo máximo de 15 minutos; no se combinan días/pasadas independientes para fingir una captura. Por ventana, se prueba la adquisición de menor nubosidad y se usan otras si la calidad local no alcanza. Las mediciones exigen al menos 50% de centros de píxel válidos en el AOI.

Mosaicos NDWI: grilla UTM WGS84 de 10 m por componente, vecino próximo, escala/offset del proveedor y máscara SCL. Se excluyen nodata, defectuosos, nubes/sombras/cirrus y nieve. Los solapamientos se resuelven en orden estable por ID, priorizando el primer píxel válido; cada centro aporta una vez. MultiPolygon se procesa por componente y se combina ponderando por píxeles válidos. El máximo operativo por ventana es 25 millones de centros; dividir áreas que lo superen.

El método nuevo `mosaic-v2;geometry-sha256=...` ancla la geometría canónica dentro del hash del registro. Las mediciones históricas v1 continúan válidas. Para varias teselas, `sceneId` es `mosaic:id+id...`; los IDs STAC individuales están en procedencia. El timestamp es inicio de adquisición y la nubosidad declarada es el máximo de las teselas. Se conserva toda la calibración/fuente usada. Detalles de compatibilidad en `docs/INTERFACES.md`.

La cola permite 16 trabajos pendientes. Solicitudes exactamente iguales pueden reutilizar resultados `succeeded`/`partial` durante seis horas; se informa `cacheHit` y `calculatedAt`. El período predeterminado se resuelve a la hora de cada solicitud, por lo que el cliente puede reenviar el período resuelto si quiere reutilizar exactamente la misma consulta. No se afirma que una caché se haya calculado en vivo.

## Evolución para Sol

- `frames`: secuencias por humedal (`scope: area`, `wetlandId`).
- `salarFrames`: secuencia con encuadre del salar entero (`scope: salar`), compuesta con las teselas necesarias. Exige 90% de cobertura visual del encuadre.

Cada fotograma incluye captura inicial/final, escenas, bbox EPSG:4326, imagen, atribución, cobertura y hashes de las mediciones realmente correspondientes. Todos los cuadros de una secuencia usan el mismo encuadre/tamaño. La imagen usa TCI del proveedor, sin ajustes adicionales variables entre fechas; el color del proveedor no es una medición radiométrica independiente. Huecos y nodata son transparentes y no se inventan cuadros para fechas ausentes.

Para Leaflet, convertir bbox oeste/sur/este/norte en `[[south,west],[north,east]]`. Resolver `imageUrl` respecto del origen de la API. Sol puede importar `processing/src/client.ts` como ejemplo/adaptador sin dependencias de Node y usar play/pausa/fecha sobre `salarFrames`. No mezclar cuadros de áreas distintas como si fueran un único encuadre. Un cuadro del salar puede no coincidir con todas las fechas elegidas por cada humedal; `measurementHashes` solo relaciona las coincidencias reales.

## Para Gaby

Descargar `/measurements` a un archivo por trabajo y pasar ese archivo al relayer:

```powershell
$env:MEASUREMENTS='ruta/relativa/al/repo/measurements.json'
npm run dry -w @vega/relayer
```

Revisar identidad/umbrales con Igna y publicar con la wallet autorizada de I3. I2 no inicia transacciones ni marca una verificación blockchain como confirmada. La respuesta, el archivo y las imágenes son independientes del estado de publicación.

NDWI no mide litros de agua ni prueba contaminación o causalidad minera. Los umbrales iniciales del repo siguen siendo provisionales desde el punto de vista ambiental; los polígonos y resultados conservan su procedencia para revisión.
