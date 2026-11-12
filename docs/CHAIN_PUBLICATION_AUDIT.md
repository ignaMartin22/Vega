# Auditoría de evidencia de publicación en Fuji

**Fecha de revisión:** 12 de noviembre de 2026  
**Repositorio:** `ignaMartin22/Vega`  
**Red:** Avalanche Fuji C-Chain (43113)  
**Contrato:** `0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5`

## Resumen

Hay dos evidencias distintas y no deben mezclarse:

1. I2 ejecutó una auditoría de solo lectura que recalculó la serie piloto y simuló las llamadas al contrato. El informe versionado en `i2/sdd-sentinel2` declara `PASS`, 105/105 recálculos coincidentes, `simulated: 105` y `alreadyRecorded: 0` en el bloque 60953369.
2. I3 incorporó después (en su rama, todavía no integrada en `main`) `sample-data/published.json` con 105 registros, 105 `dataHash` únicos y 105 `txHash` únicos. También incorporó `frontend/public/records.json` con 105 registros y los mismos 105 `dataHash`, pero sin campo `txHash`.

La diferencia temporal entre ambos artefactos puede ser compatible con una publicación posterior al preflight. Sin embargo, el contenido de un JSON no prueba que una transacción haya sido minada, que haya tenido éxito, que haya llamado al contrato correcto ni que haya emitido los eventos esperados. En esta revisión no se obtuvo confirmación RPC independiente de esos 105 recibos ni una lectura actual completa de `getMeasurements`. Por eso el estado se clasifica como **publicación declarada por I3, pendiente de verificación independiente**.

## Conteos observados en la rama I3

| Artefacto | Registros | Hashes de datos únicos | txHash |
|---|---:|---:|---:|
| `sample-data/published.json` | 105 | 105 | 105 únicos |
| `frontend/public/records.json` | 105 | 105 | No contiene |

Los 105 registros de ambos archivos tienen los mismos `dataHash` según la comparación de contenido realizada durante la revisión. La ausencia de `txHash` en `records.json` no impide por sí sola la verificación de integridad actual del frontend, que busca por `dataHash` y compara los campos on-chain; sí significa que la interfaz no dispone allí de un enlace individual a la transacción.

## Lo que el preflight I2 sí demuestra

- Recalculo de 105/105 mediciones con coincidencia de NDWI y píxeles válidos, usando el algoritmo del proyecto.
- Comparación con snapshots STAC versionados y geometrías/manifest de procedencia.
- Red Fuji, bytecode del contrato, permisos y umbrales consultados en el bloque 60953369.
- Simulación `eth_call` de 105 llamadas pendientes, sin firma ni transmisión.
- Umbrales 1500/1000/1200 verificados contra el GeoJSON piloto y el contrato en ese bloque.

No demuestra publicación posterior, calibración ecológica de los umbrales ni validación científica independiente.

## Checklist para cerrar la verificación

1. Obtener un RPC confiable de Fuji y fijar un bloque reciente.
2. Para cada uno de los 105 `txHash`, obtener el recibo y comprobar:
   - `status = 1`;
   - `to` coincide con el contrato indicado;
   - `from` corresponde a una wallet autorizada al momento de la transacción;
   - el recibo contiene `MeasurementRecorded` con `wetlandId`, `ndwi`, `sceneId`, `dataHash` y `timestamp` esperados.
3. Leer `getMeasurements(1)`, `getMeasurements(2)` y `getMeasurements(3)`; comparar los 105 registros sin omisiones ni duplicados.
4. Comprobar los eventos `WaterAlert` reales. Un valor bajo el umbral de integración no demuestra degradación ambiental.
5. Repetir el preflight `--chain` con el estado actual. Si están los 105 registros, el resultado esperado es `alreadyRecorded: 105` y `simulated: 0`.
6. Integrar los artefactos de I3 a `main` únicamente después de reconciliar todos los recibos y campos. Conservar los hashes de transacción auténticos y los links del explorer.

## Límites científicos y de publicación

La serie corresponde a tres AOI experimentales del piloto Salar del Hombre Muerto, no a límites oficiales. Los umbrales son valores de integración no calibrados ecológicamente. En particular, NDWI negativo en una vega vegetada no demuestra degradación. No publicar, promocionar ni presentar estos datos como monitoreo oficial.

## Referencias del repositorio

- Auditoría I2: `i2/sdd-sentinel2/docs/PUBLICACION_FUJI_I2.md`
- Preflight I2: `i2/sdd-sentinel2/sample-data/validation/publication-preflight.json`
- Artefactos I3: `i3/relayer/sample-data/published.json` y `i3/relayer/frontend/public/records.json`
- Verificación frontend: `frontend/src/components/VerifyButton.tsx`
