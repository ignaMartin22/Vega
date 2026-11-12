# Validación de la serie piloto para Gaby

Esta validación corresponde exclusivamente a `sample-data/measurements.json` y los tres AOI de `sample-data/wetlands.geojson`, en la base Git `26deb8d`. El informe reproducible está en `sample-data/validation/publication-preflight.json`: identifica por SHA-256 los archivos exactos revisados y contiene el bloque de la consulta a Fuji. Consultar su `status`, `errors`, `raster` y `chain` para distinguir auditoría local, recálculo y simulación.

**Ejecución del 12/11/2026, 15:29 UTC (12:29 Argentina): PASS, cero errores.** Se recalcularon 105/105 registros con coincidencia exacta de NDWI y píxeles válidos. Las 105 simulaciones pasaron en Fuji, bloque `60953369`, sin registros de esta serie ya publicados. Se comprobaron los umbrales 1500/1000/1200. La cuenta consultada fue `0x58689003F78836a21792E1b05585398CBae167b6`, autorizada y con `0.499499999339596205` AVAX de prueba. Esto verifica esa dirección del deploy; Gaby debe confirmar que es su wallet de publicación o repetir con `AUDIT_PUBLISHER`. También pasaron el dry-run, los seis tests del relayer, TypeScript de processing y el build del frontend (con aviso de tamaño de bundle).

## Alcance y resultados

- 105 registros experimentales Sentinel-2, período 2023–2025. Los hashes se verifican con la función canónica compartida y con el dry-run real del relayer.
- Se contrastan ID, fecha de adquisición, nubosidad, bandas, calibración y cobertura con los snapshots STAC versionados; la geometría se contrasta con la procedencia de cada medición.
- Se comprueban geometrías válidas, hashes únicos, una medición por mes/AOI, rangos admitidos por el contrato y cobertura válida de al menos 50%.
- Hay tres meses sin observación aceptable, documentados y sin rellenar: AOI 1, febrero 2025; AOI 2, diciembre 2023 y diciembre 2024.
- `--recompute` vuelve a leer las bandas COG públicas y compara NDWI escalado y cantidad de píxeles válidos de cada registro usando el algoritmo del proyecto. No sustituye una validación científica independiente.
- `--chain` comprueba red 43113, bytecode, permisos, saldo, configuración de umbrales, registros existentes y simula cada registro pendiente mediante `eth_call`. No firma ni transmite.

| ID | AOI piloto | Registros | Umbral ×10.000 | Valores debajo del umbral |
|---|---|---:|---:|---:|
| 1 | Laguna del sector sur | 35 | 1500 | 0 |
| 2 | Laguna del sector central | 34 | 1000 | 2 |
| 3 | Vega fluvial oriental | 36 | 1200 | 36 |

Son 38 condiciones de alerta si se publica la serie completa por primera vez con estos umbrales. Son alertas del contrato bajo umbrales de integración, **no 38 casos demostrados de degradación**. En particular, la vegetación puede tener NDWI negativo. Los AOI no son límites oficiales.

La serie usa el método legado `v1`: el hash de cada medición no incluye la geometría. Conservar junto a la serie el GeoJSON, el informe de procedencia y el manifiesto SHA-256. No cambiar coordenadas, IDs, valores, fechas o método manteniendo los hashes anteriores.

## Repetir la validación, sin clave privada

Desde la raíz, con Node 22 y dependencias instaladas:

```powershell
# Opcional: dirección PUBLICA de la wallet que realmente usará Gaby.
# Si falta, la auditoría consulta el publisher de shared/deployments/fuji.json.
$env:AUDIT_PUBLISHER = '<DIRECCION_PUBLICA_DE_GABY>'
npm run audit:pilot -w @vega/processing -- --chain --recompute
$env:MEASUREMENTS = 'sample-data/measurements.json'
npm run dry -w @vega/relayer
npm test -w @vega/relayer
```

No usar literalmente el placeholder de dirección. Si no se conoce la wallet real, omitir esa asignación y tratar la comprobación de permisos como válida solamente para la dirección indicada en el informe. El resultado RPC es una fotografía: repetir cerca del envío. `PASS` no es autorización humana de publicación ni calibración ecológica.

## Publicación por I3, después de la aprobación de Joel

El relayer usa **mocks por defecto**. Definir siempre la ruta real en la misma consola que ejecutará los comandos. Nunca transmitir desde una configuración heredada sin comprobar la ruta impresa en el dry-run.

```powershell
$env:MEASUREMENTS = 'sample-data/measurements.json'
npm run dry -w @vega/relayer
# Debe imprimir: 105 registros válidos; 105 seleccionados en sample-data/measurements.json

# Prueba corta, una vez aprobada la publicación y configurada la wallet de I3:
npm run relay -- --only-wetland 2 --limit 3
# Revisar recibos y archivos antes de continuar.

# Serie completa; los hashes ya publicados se omiten:
npm run relay
```

**La prueba corta de los primeros tres registros del AOI 2 no dispara WaterAlert.** Las mediciones bajo su umbral ocupan las posiciones 12 y 13 del subconjunto: `S2B_19JFM_20240125_0_L2A` (−475) y `S2B_19JFM_20240204_0_L2A` (−197). La serie completa sí incluye esas condiciones, además de las 36 del AOI 3. No modificar umbrales para forzar una interpretación ambiental.

El relayer actual escribe sus archivos de salida al terminar la corrida. Si se interrumpe después de confirmar algunas transacciones, esas transacciones pueden existir en Fuji aunque todavía no estén en `published.json`. Conservar logs y revisar los recibos antes de reanudar; la deduplicación evita repetir hashes, pero no reconstruye automáticamente los enlaces de transacciones omitidas. I3 debe conservar esos comprobantes.

## Cierre de la demo

1. Comprobar recibos exitosos de las nuevas transacciones y campos exactos mediante `getMeasurements`. Repetir la auditoría `--chain`; si toda la serie está publicada, debe indicar `alreadyRecorded: 105` y `simulated: 0`.
2. Conservar `sample-data/published.json` con txHash y `frontend/public/records.json` con los registros completos. Verificar que están los 105 hashes aprobados, no mocks.
3. Obtener un recibo con `WaterAlert` real y guardar su link para la demo. Si se reejecuta el relayer sobre registros existentes, no se generan alertas nuevas.
4. Configurar `VITE_DATA_SOURCE=chain`, reconstruir el frontend y comprobar mapa, serie y botón Verificar desde el navegador. Mostrar experimental/piloto en la presentación.
5. Versionar y compartir con el equipo los archivos de evidencia y documentación; no versionar `.env` ni claves.

## Texto de aprobación sugerido para Joel

> Apruebo para la demo experimental en Fuji la serie exacta de 105 registros identificada por el manifiesto de validación, con los AOI piloto 1, 2 y 3 y umbrales de integración 1500/1000/1200. No son límites oficiales ni umbrales ecológicos calibrados. Las 38 condiciones bajo umbral, incluidas las 36 del AOI 3, demuestran la lógica del contrato y no prueban degradación. Publicar con la wallet autorizada tras repetir el preflight y conservar recibos y archivos para Verificar.

Este texto es una propuesta; la auditoría no lo envía ni aprueba en nombre de Joel.
