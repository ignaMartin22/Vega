# Propuesta de integración: Sol ↔ análisis I2 ↔ Gaby

**Estado: diseño de integración; primer incremento HTTP local implementado, sin acuerdo de despliegue confirmado con I3/I4.**

Actualización: el primer incremento implementa las rutas locales y trabajos descriptos en [`processing/API.md`](../processing/API.md). Este documento conserva el diseño del alcance final; los límites actuales (catálogo parcial, Polygon simple y secuencias por AOI) se detallan en la documentación operativa. No existe aún acuerdo de despliegue ni integración UI con I3/I4.

Complementa [SDD-I2-SENTINEL2.md](SDD-I2-SENTINEL2.md). El usuario confirmó análisis desde un botón, elección por catálogo y dibujo de áreas en salares de Salta/Jujuy/Catamarca, evolución temporal por imágenes y últimos tres años por defecto. Los acuerdos de despliegue/integración con I3/I4 siguen pendientes. La documentación operativa describe qué endpoints y modalidades del diseño están implementados.

## Responsabilidades propuestas

| Parte | Responsable | Entrega |
|---|---|---|
| Selección, botón, animación y estados visibles | Sol (I4) | Cliente que consume la interfaz de análisis |
| Contrato HTTP de análisis y motor Sentinel-2 | I2 | Validación de entrada, cálculo, calidad, procedencia y resultados por trabajo |
| Exposición del servicio y operación | Gaby (I3), coordinado con I2 | Hosting, configuración, almacenamiento y ejecución de trabajos |
| Publicación en Avalanche y metadatos de tx | Gaby (I3) | Reutiliza el relayer; informa su estado separado del cálculo |
| IDs/umbrales de nuevos humedales | Igna (I1), coordinado con I2 | Acuerdo de identidad y configuración on-chain |

## Operaciones HTTP propuestas

| Operación | Propósito |
|---|---|
| `GET /api/salars?province=salta` | Consultar el catálogo; un salar compartido conserva su ID y lista todas sus provincias |
| `GET /api/salars/:salarId/wetlands` | Humedales seleccionables del salar |
| `POST /api/analyses` | Validar solicitud, crear trabajo y devolver HTTP 202 con `analysisId` y URL de consulta |
| `GET /api/analyses/:analysisId` | Consultar estado, fase, errores, calidad y ubicación de resultados cuando estén disponibles |
| `GET /api/analyses/:analysisId/result` | Recuperar registros compatibles con I3, serie, imágenes y procedencia |

No se propone ejecutar un script de shell construido con texto enviado por el cliente. El servicio invoca funciones con entradas validadas. Los tiempos de procesamiento remotos hacen preferible devolver un identificador y consultar el progreso.

## Solicitudes ilustrativas

```json
{
  "salarId": "id-estable-del-catalogo",
  "wetlandIds": [101, 102]
}
```

Los IDs son ejemplos de formato, no asignan identidades reales. Al omitir fechas, el servicio persiste la fecha/hora de solicitud como `to` y calcula tres años calendario anteriores como `from`. La respuesta devuelve el período exacto resuelto. Si se admiten fechas explícitas, se validan y documentan; el período inicial confirmado sigue siendo tres años.

Modalidad de dibujo: la misma operación admite `areas` como GeoJSON Features con geometría Polygon/MultiPolygon y propiedades de presentación. Debe incluir al menos una entrada entre `wetlandIds` y `areas`; si se permiten ambas en la misma solicitud, no se duplican las geometrías idénticas.

```json
{
  "salarId": "id-estable-del-catalogo",
  "areas": [{
    "type": "Feature",
    "properties": { "name": "Área seleccionada por el usuario" },
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[-67.10, -25.40], [-67.09, -25.40], [-67.09, -25.39], [-67.10, -25.39], [-67.10, -25.40]]]
    }
  }]
}
```

Las coordenadas ilustran la estructura, no definen un humedal aprobado. El servicio valida geometría, tamaño y pertenencia territorial antes de crear el trabajo; resuelve una identidad/versionado persistentes sin aceptar del cliente un `wetlandId` on-chain arbitrario. La asignación de IDs y configuración de umbrales se coordina con Igna/Gaby. La provincia filtra el catálogo; la solicitud referencia un salar único, no una copia por provincia.

## Estados propuestos

`queued → running → succeeded | partial | no_data | failed`

- `running` incluye una fase: búsqueda de escenas, control de calidad, cálculo o preparación de resultados. Se evita inventar un porcentaje si no se puede medir.
- `partial`: existen resultados válidos, pero faltan áreas o fechas pedidas. Explica qué falta.
- `no_data`: ninguna observación satisface los controles; no equivale a “no hay agua”.
- `failed`: problema técnico que impide completar la solicitud.
- La publicación usa un campo independiente: `not_requested | pending | confirmed | failed`, completado por la integración de Gaby. Un análisis correcto no se muestra como verificado on-chain hasta comprobarlo.

Las solicitudes iguales pueden reutilizar una caché si coinciden geometría/versionado, fechas y parámetros/método. El resultado informa `cacheHit` y fecha del cálculo reutilizado. Solicitudes distintas tienen archivos y estados aislados. El mecanismo de deduplicación, persistencia y recuperación tras reinicio debe acordarse con Gaby antes del despliegue.

## Datos para Sol

- Catálogo: ID estable, nombre, `provinces[]`, geometría o referencia a ella, `bbox`, centro y fuente.
- Resultados por humedal: ID, geometría/versionado, valores NDWI con fecha, calidad y motivos de fechas sin dato.
- Comparación: diferencia absoluta de NDWI entre dos observaciones aceptadas del mismo AOI/método; NDWI negativo/cero impide tratar una diferencia porcentual como medida general de pérdida de agua.
- Imágenes: escena, fecha de captura, bandas/render utilizado, límites geográficos, URL de imagen/tiles y atribución. No asumir que el navegador puede mostrar directamente un COG grande.
- Animación temporal confirmada: secuencia ordenada de imágenes con fecha, encuadre consistente y metadatos de escena. El frontend identifica las capturas como imágenes históricas y no como señal en directo.
- Verificación: registros canónicos y hashes; metadatos de tx únicamente cuando los aporte Gaby.

El resultado HTTP puede envolver `measurements: HashedMeasurement[]` junto con datos auxiliares. Al relayer actual se entrega el array existente en un archivo por trabajo, sin cambiar sus campos ni su hash. La adaptación para que I3 consuma esos archivos y exponga publicaciones es un punto de integración con Gaby; no está implementada por redactar este documento.

## Límites a acordar antes de implementar

- Fuente y exhaustividad del catálogo de salares y de los polígonos de humedales.
- Dibujo de áreas confirmado; falta acordar persistencia de identidad, validación territorial y asignación de IDs/umbrales.
- Área máxima, cantidad de humedales, rango temporal y concurrencia para que una solicitud sea operable.
- Cobertura de múltiples teselas y geometrías complejas: soporte explícito o error identificable; no recortar silenciosamente.
- Dominio/URL que desplegará Gaby, persistencia, acceso y coordinación con el cliente de Sol.
- Evolución por imágenes y tres años ya confirmados; falta verificar recursos/latencia y acordar resolución/tamaño de los fotogramas.

## Fotogramas para la evolución temporal

La salida incluye `frames`, ordenados por captura, separados de los registros canónicos del relayer. Cada elemento propuesto contiene:

```ts
interface EvolutionFrame {
  frameId: string;
  capturedAt: string; // ISO: adquisición real
  sceneIds: string[];
  imageUrl: string; // formato consumible por el navegador
  bbox: [number, number, number, number]; // oeste, sur, este, norte
  crs: "EPSG:4326";
  measurementHashes: string[]; // mediciones correspondientes
  coverageFraction: number; // 0..1; definición documentada
  attribution: string;
}
```

Es un tipo auxiliar propuesto, no una modificación de `shared/` ni un endpoint implementado. El endpoint de assets y su almacenamiento forman parte del contrato por concretar con Gaby. Todos los fotogramas mantienen encuadre y política de color; no se inventan cuadros para meses sin datos. Si se usan varias escenas, se conserva su procedencia y coherencia temporal. La correspondencia entre imagen y medición debe ser exacta o indicar que no existe para ese AOI/fecha.

Sol implementa play/pausa y navegación por fechas. I2 entrega los cuadros y metadatos; no se requiere una transición de cámara desde el espacio.
