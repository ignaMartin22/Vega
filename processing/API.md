# Servicio I2 · incremento 1

El servicio llama al motor Sentinel-2 desde HTTP. Usa datos reales; no lee automáticamente la serie experimental precalculada. Este incremento **no completa todavía** el catálogo regional ni la animación del salar completo.

## Arrancar

Node 22 y dependencias del monorepo instaladas. Desde la raíz:

```powershell
npm run serve -w @vega/processing
```

Escucha en `http://127.0.0.1:8787`. Datos persistidos en `processing/runtime/` (ignorado por Git). Detener y volver a iniciar conserva resultados; trabajos interrumpidos pasan a `failed` con una explicación, sin reanudación ficticia.

Variables: `HOST` (por defecto `127.0.0.1`), `PORT` (8787), `ANALYSIS_DATA_DIR` (directorio absoluto recomendado), `ANALYSIS_CONCURRENCY` (1–4 trabajos, defecto 1) y `ALLOWED_ORIGINS` (orígenes separados por coma; defecto localhost/127.0.0.1:5173). Una sola instancia por directorio de datos. Gaby debe acordar la exposición y operación antes de desplegarlo; la configuración predeterminada es para desarrollo local.

## Solicitud desde el frontend de Sol

```ts
const started = await fetch('http://127.0.0.1:8787/api/analyses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ salarId: 'hombre-muerto', wetlandIds: [1] }),
});
if (!started.ok) throw new Error((await started.json()).error);
const { analysisId, period } = await started.json();
// Consultar GET /api/analyses/:analysisId hasta un estado terminal.
```

Sin fechas, resuelve los últimos tres años desde la solicitud, divididos en 36 ventanas. Para una prueba breve se permiten `from` y `to` ISO UTC, por ejemplo `2024-04-01` y `2024-05-01`. No solicitar fechas futuras ni intervalos mayores a tres años. Cada ventana es [inicio, fin), sin duplicar capturas en sus bordes.

Catálogo: `GET /api/salars?province=salta` y `GET /api/salars/hombre-muerto/wetlands`. `coverage.complete` es `false`: actualmente solo está Hombre Muerto, con provincias Salta y Catamarca. La consulta de Jujuy devuelve catálogo vacío con esa limitación explícita.

Para dibujar dentro del piloto, enviar `areas: [GeoJSONFeature]` además de/o en lugar de `wetlandIds`. Se admite Polygon sin agujeros, anillo cerrado simple, 3–500 vértices y ventana menor a 100 km². Para el Salar del Hombre Muerto se mantiene la restricción a la extensión piloto; no es una delimitación oficial.

### Importar GeoJSON para otro salar

El endpoint también admite una FeatureCollection GeoJSON para un salar que todavía no figure en el catálogo:

```json
{
  "salarId": "salar-prueba-jujuy",
  "salarName": "Salar de prueba",
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "Laguna de prueba" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[-68.10,-25.40],[-68.09,-25.40],[-68.09,-25.39],[-68.10,-25.39],[-68.10,-25.40]]]
        }
      }
    ]
  }
}
```

En esta modalidad:
- `salarId` es un slug estable elegido por el cliente y `salarName` es el nombre descriptivo. No agrega automáticamente el salar al catálogo público.
- `geojson` debe ser una FeatureCollection con entre 1 y 5 Features Polygon.
- Cada polígono debe tener un único anillo exterior cerrado, 3–500 vértices y una ventana inferior a 100 km².
- Se validan coordenadas WGS84, cierre, área, autointersecciones y límites de tamaño. MultiPolygon y agujeros se rechazan con HTTP 400.
- Para un salar externo no existe todavía una frontera oficial cargada en el servicio: se acepta la geometría que aporta el usuario, pero **no se certifica que esté dentro del salar nombrado**. Revisar ubicación y límites antes de interpretar resultados.
- Los humedales importados reciben IDs provisionales persistidos localmente, distintos según salar y geometría. El umbral se inicializa en cero solo como placeholder técnico; no es un umbral ambiental calibrado.
- Los resultados quedan marcados para revisión. No se publican automáticamente en Avalanche ni deben enviarse al relayer sin acordar identidad, ID y umbral con I1/I3.

Repetir el mismo `salarId` y la misma geometría serializada conserva el ID provisional. Una geometría rotada/invertida/reordenada no se normaliza topológicamente. Máximo cinco áreas por solicitud. Para un salar fuera del catálogo no se aceptan `wetlandIds` del catálogo: se debe enviar GeoJSON.

## Estado y resultados

- `POST /api/analyses` → 202 con `analysisId`, `statusUrl`, período resuelto y `cacheHit:false`.
- `GET /api/analyses/:id` → `queued`, `running`, `succeeded`, `partial`, `no_data` o `failed`; fase y unidades completadas/totales.
- `GET /api/analyses/:id/result` → resultado una vez preparado; 409 si todavía no existe. Un fallo técnico puede tener un resultado diagnóstico sin mediciones; el estado sigue siendo `failed`.
- `GET /api/analyses/:id/measurements` → array canónico para I3, con cabecera de revisión requerida. No inicia transacciones.
- `GET /api/analyses/:id/assets/:frameId.png` → imagen PNG.
- `GET /health` → servicio disponible y catálogo incompleto explícito.

No se implementó reutilización de caché: cada solicitud crea trabajo propio y devuelve `cacheHit:false`. Cola máxima: 16 trabajos en espera. Estado y resultados se guardan en carpetas por UUID. El estado de publicación permanece `not_requested`.

El resultado incluye `measurements`, `areas`, `provenance`, `frames` e `issues`. Las incidencias distinguen búsqueda/lectura fallida, falta de datos, cobertura que requiere composición de teselas e imagen fallida. Si existen mediciones pero faltan fechas o imágenes, el estado es `partial`. Ausencia de datos no significa ausencia de agua.

## Reproducción temporal

Cada `frames[]` tiene `wetlandId`, `capturedAt`, `sceneIds`, `imageUrl`, `measurementHashes`, `bbox` en orden oeste/sur/este/norte y `crs: EPSG:4326`. Las URLs son relativas a la API: Sol debe resolverlas contra su origen.

Los PNG se reproyectan a EPSG:4326 con vecino próximo y usan el mismo bbox/tamaño para cada área en todas las fechas; fuente TCI de Sentinel-2, sin ajustes adicionales por fecha. No constituyen una comparación radiométrica de los colores del proveedor. Para Leaflet: `bounds=[[south,west],[north,east]]`. Agrupar fotogramas por `wetlandId` y ordenar por `capturedAt` para reproducir una secuencia. No unir fotogramas de áreas distintas como si compartieran encuadre.

**Alcance actual: `scope: area`.** Hay imágenes por AOI, no un mosaico del salar completo. Se entregan solo capturas correspondientes a mediciones aceptadas. Si falta una fecha, no se crea un cuadro artificial. NDWI y hash siguen el esquema compartido v1; la geometría/versión se informa como procedencia auxiliar.

## Pendientes del alcance completo

- Catálogo y límites verificados para todos los salares solicitados de las tres provincias.
- Geometrías complejas y composición de teselas/zonas UTM, sin contar píxeles superpuestos dos veces.
- Secuencia con encuadre del salar completo cuando requiere mosaicos.
- UI y reproducción de Sol; infraestructura y publicación de Gaby; acuerdo de IDs/umbrales con Igna.
- Validación científica externa e interpretación de umbrales. NDWI no prueba contaminación ni causalidad minera.

Protocolo de este incremento y checklist: [`../docs/specs/i2-web-analysis/`](../docs/specs/i2-web-analysis/).
