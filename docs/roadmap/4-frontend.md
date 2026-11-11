# I4 · Frontend

**Sos dueño de:** `frontend/` (salvo `frontend/public/records.json`, que lo escribe el relayer)
**Entregás:** mapa público con los humedales, serie NDWI, alertas y botón **"Verificar"** leyendo Fuji · video demo
**No dependés de nadie:** el frontend ya arranca en modo `mock` con `npm run dev:front`, con polígonos de ejemplo y 102 mediciones de formato real.

## Día 1 · Mié 11

- [ ] `npm install`, `npm run mock` y `npm run dev:front` → ver el esqueleto en http://localhost:5173
- [ ] Diseño general: header con el pitch en una frase, mapa a la izquierda y panel del humedal a la derecha (mobile: apilado)
- [ ] Mapa: capa base **NASA GIBS** o Sentinel-2 true color en lugar de OSM, polígonos coloreados por estado (ok / en alerta)
- [ ] Gráfico NDWI con la línea de umbral y los puntos bajo el umbral marcados en rojo
- [ ] Tabla de mediciones: fecha, NDWI, escena (link a Copernicus Browser), hash abreviado y link a la tx (si hay `txHash`)
- [ ] Botón **"Verificar"** por medición, con una explicación de 1 línea: *"recalculamos el hash del dato y lo comparamos con el registrado en Avalanche"*
- [ ] Demo de manipulación: un toggle "simular dato alterado" que cambie el NDWI off-chain y muestre ✘ (muy útil para el video)

## Día 2 · Jue 12

- [ ] Con el **H1**: probar `VITE_DATA_SOURCE=chain` contra el contrato en Fuji (aunque tenga pocas mediciones)
- [ ] Leer eventos `WaterAlert` con `registry.queryFilter(...)` desde `DEPLOY_BLOCK` y mostrar un panel "Alertas públicas"
- [ ] Con el **H2**: verificar que los polígonos reales se centren bien en el mapa (ajustar `center` y `zoom`)
- [ ] Con el **H4**: modo `chain` con la serie real, verificación OK de punta a punta
- [ ] Estados de carga y error (RPC lento) + fallback a mock si falla la red
- [ ] Footer con la **atribución de datos** (la escribe I2) y la dirección del contrato con link al explorer
- [ ] Coordinar con I3 el deploy en Vercel

## Entrega · Video demo (1 a 3 min, 1080p, notificaciones apagadas)

Guion sugerido:

1. El problema en 15 segundos (un plano del salar en el mapa)
2. El dato entrando: I3 corre el relayer y se ve la tx en el explorer de Fuji
3. El mapa con la serie y el `WaterAlert` on-chain
4. "Verificar" → ✔. "Simular alteración" → ✘
5. Cierre con el pitch en una frase

Tener a mano la **tx de respaldo** de I3 por si la red falla durante la grabación.

## Cómo trabajar sin esperar a otros

| Necesitás… | Usá… |
|---|---|
| Datos | Modo `mock` (`frontend/src/data/source.ts`), mismo formato que on-chain |
| Polígonos | `sample-data/wetlands.geojson` (de ejemplo hasta el H2) |
| Leer el contrato | `shared/src/abi.ts` + `shared/deployments/fuji.json` (cuando exista) |
| Verificar | `hashRecord()` / `verify()` de `@vega/shared`, nunca un hash propio |

**Lo que NO podés hacer sin avisar:** cambiar `shared/` o asumir campos que no están en `INTERFACES.md`.
