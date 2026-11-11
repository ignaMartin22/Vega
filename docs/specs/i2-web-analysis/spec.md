# Especificación · I2 análisis web

Flujo SDD: especificación → plan → tareas → implementación → pruebas. No se instaló ni se declara utilizado un framework SDD externo. El segundo incremento completa el motor/API de I2; la integración visual y publicación/despliegue permanecen con I4/I3.

## Requisitos del producto

- R1. El botón de Sol crea un análisis asincrónico; su progreso y resultado se consultan por ID.
- R2. Se admiten humedales de catálogo y áreas dibujadas dentro del salar elegido.
- R3. El período omitido equivale a tres años móviles, con meses/fechas UTC y ajuste bisiesto.
- R4. Sentinel-2 produce NDWI canónico, calidad y procedencia; los registros mantienen compatibilidad con I3.
- R5. La evolución usa imágenes históricas reales con fecha, encuadre fijo por secuencia y relación con sus mediciones.
- R6. Los datos y assets de solicitudes diferentes quedan separados; el estado sobrevive reinicios.
- R7. Salares regionales tienen IDs estables y provincias múltiples. Catálogo parcial y limitaciones de geometría/teselas se exponen explícitamente.
- R8. El estado del análisis no equivale a publicación/confirmación blockchain.

## Alcance del incremento 1

Servicio local ejecutable, trabajos persistidos, cálculo parametrizado de tres años, humedales piloto y dibujo Polygon validado contra el salar piloto, imágenes PNG por AOI y contrato HTTP verificable. El motor anterior sigue utilizable por CLI.

## Segundo incremento: cierre de I2

Implementados: catálogo regional respecto de fuentes IGN/USGS, límites provinciales y salares compartidos, MultiPolygon/agujeros, identidad geométrica canónica, grilla NDWI entre teselas/zonas UTM sin solapamientos, imágenes del salar completo, caché explícita, cliente de integración y exportación offline. La cobertura no es un inventario ecológico exhaustivo ni una validación ambiental experta. UI de Sol y despliegue/publicación de Gaby son responsabilidades externas a I2.

## Criterios verificables

- POST válido devuelve 202 e ID; peticiones inválidas no crean trabajos.
- Fechas predeterminadas se resuelven una sola vez y forman 36 ventanas contiguas sin solapamiento.
- Dos solicitudes tienen carpetas distintas y no mezclan resultados.
- El cálculo de un error técnico no devuelve un falso `succeeded` ni datos inventados.
- Un reinicio conserva resultados terminados e identifica trabajos interrumpidos.
- El resultado de catálogo/dibujo entrega datos canónicos y declara cobertura/identidad pendientes cuando corresponda.
- Los PNG se sirven con escena, captura y bbox de su AOI; no se etiquetan como mosaico de todo el salar.
