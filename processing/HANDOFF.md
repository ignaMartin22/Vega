# Entrega I2 → I3/I4

## Entrega actual del sistema

- Sol: `npm run serve -w @vega/processing`; consumir catálogo → POST análisis → estado → resultado. `salarFrames` es la secuencia del salar completo; `frames`, la de cada humedal. Cada PNG tiene bbox/fecha/escenas. Adaptador sin dependencias Node en `src/client.ts`.
- Gaby: API por defecto en 8787, datos en directorio persistente, configuración en [API.md](API.md) y Dockerfile entregado. Descargar `/measurements` para el relayer; I2 no publica transacciones. Docker no está instalado en el entorno de desarrollo: la imagen queda para validación en el entorno de I3.
- Igna: nuevos IDs de catálogo/dibujo no heredan los umbrales 1/2/3. Revisar configuración; `reviewRequired:true` permanece explícito.
- Compatibilidad: método v2 y geometría comprometida en `method`; misma forma del registro/hash/ABI. `sceneId` compuesto se resuelve a IDs STAC individuales mediante procedencia.
- Fuentes/snapshot y reconstrucción en [CATALOG.md](CATALOG.md). El catálogo de agua no pretende inventariar todas las vegas/bofedales; el usuario puede dibujar áreas no listadas.
- Respaldo offline de un trabajo terminado: `npm run export -w @vega/processing -- <analysisId> <directorio>`. Identifica fechas/caché como históricas, nunca como cálculo en vivo.

## Prueba histórica anterior

> **Prueba técnica previa al SDD.** Los archivos siguientes son datos experimentales reutilizables; no completan la entrega funcional desde la web. El alcance vigente incluye catálogo + dibujo, evolución por imágenes y tres años móviles: ver [SDD](../docs/SDD-I2-SENTINEL2.md). Para el primer servicio HTTP local ya implementado y sus límites, ver [API.md](API.md); el flujo completo con el frontend aún debe integrarse.

Serie real del Salar del Hombre Muerto, Sentinel-2 L2A, enero 2023–diciembre 2025. No se modificaron las interfaces de `shared/`, el contrato, el relayer ni el frontend.

| AOI | Registros | NDWI mínimo | NDWI máximo | Mínima cobertura válida |
|---|---:|---:|---:|---:|
| 1 · Laguna del sector sur | 35 | 0.4893 | 0.8718 | 71.2% |
| 2 · Laguna del sector central | 34 | -0.0475 | 0.6911 | 50.9% |
| 3 · Vega fluvial oriental | 36 | -0.2242 | 0.0158 | 71.0% |

**105 registros y 105 hashes válidos** comprobados con el dry-run existente de I3. Los meses 2025-02 (AOI 1), 2023-12 y 2024-12 (AOI 2) no tienen escenas que superen el control del 50% de píxeles válidos bajo el filtro de nubosidad. No se rellenaron ni interpolaron.

## Para integrar

- Registros para sellar: [`../sample-data/measurements.json`](../sample-data/measurements.json).
- Polígonos/IDs/umbrales para el mapa: [`../sample-data/wetlands.geojson`](../sample-data/wetlands.geojson).
- Calidad y procedencia: [`../sample-data/measurements.report.json`](../sample-data/measurements.report.json).
- Resumen/CSV: `sample-data/measurements.summary.json` y `sample-data/measurements.csv`.
- Evidencia visual: [`../sample-data/validation/sentinel-aois.png`](../sample-data/validation/sentinel-aois.png), rojo=1, cian=2, amarillo=3.
- Respaldo de 1.367 items STAC: `sample-data/stac/wetland-{1,2,3}.json.gz`. No incluye las bandas; los registros y la imagen permiten presentar la entrega sin red.

Desde la raíz en PowerShell:

```powershell
$env:MEASUREMENTS='sample-data/measurements.json'
npm run dry -w @vega/relayer
# I3 publica cuando contrato, wallet y red estén configurados:
npm run relay
```

I3 debe usar `measurements.json` explícitamente: el relayer todavía toma mocks por defecto. La generación de `frontend/public/records.json` y el enlace de tx son trabajo de I3; esta entrega contiene datos off-chain y no prueba publicación en Fuji. I4 puede usar el GeoJSON ya actualizado, pero su fuente por defecto también sigue siendo mock.

## Alertas y límites

Se conservan los umbrales 1500/1000/1200 por compatibilidad. Con ellos, **dos observaciones del AOI 2** están debajo de 0.10; las 36 del AOI 3 están debajo de 0.12. El AOI 3 tiene vegetación: NDWI negativo puede ser esperable y ese umbral no permite diagnosticar degradación. No presentar estos cruces como prueba de daño minero. Son condiciones que el contrato evaluaría si I3 publica los registros con esos umbrales.

Las áreas fueron digitalizadas como AOI piloto, inspeccionadas sobre Sentinel-2 y documentadas en `sample-data/AOI.md`. No son límites oficiales. Queda pendiente comparación numérica externa con Copernicus Browser en 2-3 fechas y validación experta de límites/umbrales.

## Verificación realizada

- TypeScript de los cuatro workspaces.
- Pruebas con GeoTIFFs servidos por HTTP Range: UTM, máscara SCL a distinta resolución, nodata, agujeros y NDWI de referencia conocido.
- Pruebas de paginación STAC, deduplicación, selección mensual y offset.
- Auditoría de los 105 registros: hashes, rango NDWI, píxeles, procedencia y un registro por AOI/mes.
- Dry-run del relayer sobre el archivo real, sin enviar transacciones.

## Texto para pitch y atribución

“Procesamos tres áreas piloto del Salar del Hombre Muerto con imágenes públicas Sentinel-2. Entregamos 105 mediciones mensuales de 2023 a 2025, excluyendo escenas con cobertura válida insuficiente. Cada registro conserva su escena de origen y un hash reproducible, listo para sellarse en Avalanche.”

Contains modified Copernicus Sentinel data 2023–2025, processed by Vega. Acceso por Earth Search / Element 84 sobre AWS Open Data. La digitalización inicial utilizó Esri World Imagery; la imagen de validación distribuida es Sentinel-2. Fuentes técnicas, límites e instrucciones completas en [README.md](README.md).
