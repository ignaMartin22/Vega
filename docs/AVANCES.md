# Avances del equipo

Registro de lo terminado y de lo que cada integrante puede hacer a partir de eso. Cada uno agrega su sección al completar un hito.

---

## 📍 Estado al jue 12/11 y lo que falta para la entrega

**Entrega: vie 13/11, 09:00.** Lo que no esté en `main` y probado esta noche no entra.

### ✅ Terminado e integrado en `main`
| Parte | Estado |
|---|---|
| I1 · Contrato | `VegaRegistry` desplegado y verificado en Fuji (`0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5`), umbrales 1→1500, 2→1000, 3→1200, wallet de I3 autorizada como publisher. 16 tests. |
| I2 · Datos | 105 mediciones reales 2023-2025 de 3 AOI de Hombre Muerto (`sample-data/measurements.json`). API de análisis con catálogo regional (135 salares, 506 cuerpos de agua), Polygon/MultiPolygon, mosaicos de teselas. 16 tests. |
| I3 · Relayer | Publica con validación de hash, deduplicación, reintentos, `--only-wetland`/`--limit` y genera `records.json`. 6 tests. |
| I4 · Frontend | Landing, mapa, gráfico NDWI, botón Verificar, panel de análisis GeoJSON. Build OK, 4 tests. |
| Pitch | Guion por slide en `docs/PITCH.md`; guion de demo en `docs/PITCH_DEMO.md`. |

### 🚨 Bloqueante n.º 1: verificar la publicación declarada por I3
La auditoría read-only de I2 del 12/11/2026 consultó el bloque Fuji `60953369`: `alreadyRecorded: 0` y `simulated: 105`. Posteriormente, la rama `i3/relayer` incorporó `sample-data/published.json` con 105 `txHash` únicos y `frontend/public/records.json` con 105 registros sin `txHash`. Esto es evidencia de archivos generados, no confirmación independiente de transacciones. Antes de mostrar el modo `chain`, I1/I3 deben comprobar recibos exitosos, eventos `MeasurementRecorded`, campos de `getMeasurements` y al menos un `WaterAlert` real. No afirmar todavía que la serie está publicada.

### Qué hace cada uno hoy (en este orden)
**I3 · Relayer (lo primero del día)**
- [ ] Prueba corta: `npm run relay -- --only-wetland 2 --limit 3`; confirmar las tx en Snowscan.
- [ ] Verificar los 105 `txHash` ya declarados en `i3/relayer`: recibos, contrato destino, emisor, eventos y campos. Si hay diferencias, corregir los artefactos a partir de recibos reales; nunca inventar ni completar hashes.
- [ ] Pasar a I4 e I1 el `txHash` de un `WaterAlert` solo después de confirmar el recibo y decodificar el evento.
- [ ] Deploy del frontend en Vercel con `VITE_DATA_SOURCE=chain`, junto con I4.

**I4 · Frontend**: checklist completo en la sección *"🎯 Frontend"* más abajo. Mínimo para el video:
- [ ] Modo `chain` contra Fuji con los datos de I3.
- [ ] Panel "Alertas públicas" (`WaterAlert`), tabla de mediciones con Verificar por fila, toggle "simular dato alterado".
- [ ] Footer: "Copernicus Sentinel data 2023-2025" y link al contrato en Snowscan.
- [ ] Grabar el video demo (1 a 3 min) con la tx de respaldo a mano.

**I2 · Datos**
- [ ] Confirmar con I3 qué serie se publica (las 105 de `measurements.json`) y que los umbrales siguen siendo 1500/1000/1200, o pedirle a I1 un `setThreshold`.
- [ ] Captura del gráfico NDWI real para `[[GRAFICO_NDWI]]` del pitch.
- [ ] Si se muestra el análisis GeoJSON en la demo: dejar un resultado precalculado (`npm run export -w @vega/processing`) porque una corrida de 3 años tarda unos 18 min.

**I1 · Contratos e integración**
- [ ] Revisar y mergear los PR del día (I3 y I4) y verificar las mediciones on-chain después de la publicación.
- [ ] `setThreshold` si I2 lo pide.
- [ ] README final: link al video, al deck y a la URL de Vercel; completar `[[EQUIPO]]`, `[[CAPTURA_MAPA]]` y `[[VIDEO]]` en el pitch.
- [ ] Deck con el manual de marca, siguiendo `docs/PITCH.md`.

### Cierre (jue a la noche)
- [ ] Ensayo del pitch completo con el video.
- [ ] Prueba desde otro dispositivo de la URL de Vercel.
- [ ] Checklist de entrega del README tildado.

---

## ✅ I1 · Contratos: hito H1 completo (mié 11/11)

### Qué está hecho

| | |
|---|---|
| **Contrato** | `VegaRegistry` desplegado en **Avalanche Fuji C-Chain** |
| **Dirección** | `0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5` |
| **Explorer** | https://explorer-test.avax.network/c-chain/address/0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5 |
| **Tx de deploy** | `0xfd51933094923ae2d7803abdc6095015f1083a20586d38a153cc32b026d96897` (bloque `60898760`) |
| **Owner / publisher inicial** | `0x58689003F78836a21792E1b05585398CBae167b6` (wallet de I1) |
| **Umbrales on-chain** | humedal 1 → `1500`, humedal 2 → `1000`, humedal 3 → `1200` (NDWI × 10.000) |
| **Tests** | 16 tests en verde (`forge test`), incluido un fuzz test |
| **Fuente de verdad** | `shared/deployments/fuji.json` (dirección, bloque, tx, publisher) |

### Comportamiento del contrato (lo que hay que saber para usarlo)

- `recordMeasurement(wetlandId, ndwi, sceneId, dataHash, timestamp)`: **solo wallets autorizadas** (allowlist `publishers`).
- Revierte con:
  - `NotPublisher()` si la wallet no está autorizada
  - `AlreadyRecorded(hash)` si el `dataHash` ya existe (no se duplica)
  - `InvalidNdwi(ndwi)` si el NDWI está fuera de `[-10000, 10000]`
  - `EmptyHash()` si el hash es cero
- Emite `MeasurementRecorded` siempre y `WaterAlert` **solo si el humedal tiene umbral configurado y `ndwi < umbral`** (si `ndwi` es igual al umbral, no hay alerta).
- Además de los eventos de la interfaz, el contrato emite `ThresholdSet` y `PublisherSet` (eventos administrativos, no están en `shared/src/abi.ts` porque nadie los necesita leer).
- `isRecorded(hash)` permite que el relayer saltee lo ya sellado y que el frontend consulte.
- La interfaz pública (`IVegaRegistry.sol` ≡ `shared/src/abi.ts`) **no cambió**.

### Pendiente de I1
- [x] Wallet del relayer de I3 autorizada: `0x8Dad82597FE391675ED2fEE9cc9781e73141dc96` (tx `0x777f309335e1213349b751dfcdd5d88299145954c2d8610825f81fe0018dc90c`)
- [x] Código del contrato verificado en el explorer (Routescan/Snowscan): https://testnet.snowscan.xyz/address/0xbed76c9b117ec31022ae7f07b0982545c16d1dd5#code
- [ ] Ajustar umbrales con `setThreshold` si I2 lo pide (sin redeploy)
- [ ] Pitch deck y README final

---

## 👉 Qué puede hacer cada integrante con esto

Primero, en tu rama: `git pull origin main`.

### I3 · Relayer: ya podés publicar en Fuji

1. **Creá tu propia wallet para el relayer.** Con Foundry instalado, en **tu terminal** (no la pegues en ningún chat):
   ```bash
   ~/.foundry/bin/cast wallet new
   ```
   Guardá la `Private key` en tu `.env` (`PRIVATE_KEY=0x...`). Ver "Lecciones" más abajo: **no sirven las cuentas "sin semilla" de Core**.
2. **Cargala con AVAX** en el faucet de Builder Hub (C-Chain, 0,5 AVAX por día). En Core también podés pasar AVAX de P-Chain a C-Chain.
3. **Pasale a I1 SOLO tu dirección pública** (`0x...`). I1 la autoriza con:
   ```bash
   cast send 0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5 "setPublisher(address,bool)" <TU_WALLET> true --rpc-url $FUJI_RPC_URL --private-key $PRIVATE_KEY
   ```
   Para comprobar que quedaste autorizado (tiene que dar `true`):
   ```bash
   cast call 0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5 "publishers(address)(bool)" <TU_WALLET> --rpc-url https://api.avax-test.network/ext/bc/C/rpc
   ```
4. **Probá con pocas mediciones mock** antes de la serie real. El relayer toma la dirección de `shared/deployments/fuji.json` automáticamente:
   ```bash
   npm run dry -w @vega/relayer   # valida los hashes, sin enviar transacciones
   npm run relay                  # publica (con PRIVATE_KEY en el .env de la raíz)
   ```
   Conviene agregar primero el flag `--limit` (está en tu roadmap) para no sellar los 102 registros mock en Fuji. Si se sellan los mock, quedan para siempre y mezclados con los reales en el mapa.
5. **Esperado:** con los mock, el humedal 2 cae bajo `1000`, así que tiene que aparecer un `WaterAlert` en el explorer.
6. **Gas:** el deploy completo costó menos de 0,0001 AVAX, así que 0,5 AVAX alcanzan de sobra para la serie.

### I4 · Frontend: ya podés leer el contrato real

- `VITE_DATA_SOURCE=chain` en el `.env` de la raíz. La dirección sale de `shared/deployments/fuji.json` y no hay que copiarla.
- Para leer eventos (`WaterAlert`, `MeasurementRecorded`) usá `DEPLOY_BLOCK` de `@vega/shared` (bloque `60898760`) como `fromBlock`.
- Hasta que I3 publique, `getMeasurements()` devuelve listas vacías: mostrá un estado "sin mediciones aún" y mantené el modo mock para diseñar.

### I2 · Datos: los umbrales ya están on-chain

- Los umbrales de `sample-data/wetlands.geojson` coinciden con los del contrato. Si con los datos reales hay que cambiarlos, avisá a I1: se ajustan con `setThreshold`, sin redeploy, y hay que actualizar el GeoJSON en el mismo momento.

---

## 🧠 Lecciones aprendidas (para no repetir errores)

- **Las cuentas "Sin semilla" de Core Wallet (login con Google o Apple) no permiten exportar la clave privada.** Para Foundry o el relayer, generá una wallet con `cast wallet new` y mandale AVAX desde Core.
- **Nunca corras comandos que impriman claves dentro de un chat con IA** (por ejemplo, `! cast wallet new` en Claude Code). Si pasó, descartá esa wallet antes de cargarle fondos.
- **El `.env` va en la raíz de la carpeta donde trabajás** (si usás un worktree, en la raíz del worktree). Nunca se commitea: ya está en `.gitignore`.
- **Cargar el `.env` según la consola:**
  - Git Bash: `set -a; source ../.env; set +a` y después `$PRIVATE_KEY`
  - PowerShell:
    ```powershell
    Get-Content ..\.env | Where-Object { $_ -match '^\s*([A-Z_]+)=([^#\s]*)' } | ForEach-Object { Set-Item "env:$($Matches[1])" $Matches[2] }
    ```
    y después `$env:PRIVATE_KEY`
  - cmd:
    ```bat
    for /f "usebackq eol=# tokens=1,* delims==" %a in ("..\.env") do @set "%a=%b"
    ```
    y después `%PRIVATE_KEY%`
- **Para recuperar la dirección pública desde la clave:** `cast wallet address --private-key <clave>`.
- **Simulá antes de transmitir:** `forge script` sin `--broadcast` estima el gas y no gasta nada.
- **El `deployBlock` que escribe `Deploy.s.sol` sale de la simulación** y puede estar unos bloques antes. El valor correcto sale del recibo: `cast receipt <tx> blockNumber`.

---

## I2 · Motor satelital y API listos para integración (11/11)

Rama: `i2/sdd-sentinel2`. Instrucciones: [`processing/API.md`](../processing/API.md), [`processing/HANDOFF.md`](../processing/HANDOFF.md).

- Servicio HTTP: catálogo → solicitud → progreso → resultado → PNG de evolución. Selección por catálogo y dibujo de Polygon/MultiPolygon con agujeros.
- Catálogo regional IGN/USGS: 135 entradas de salares/salinas y 506 cuerpos de agua; salares compartidos conservan un ID. Cobertura respecto de fuentes/snapshot, no inventario ecológico exhaustivo.
- Tres años móviles, máscara SCL, NDWI sobre grilla de 10 m, composición de teselas/zonas UTM y solapamientos sin doble conteo. Imágenes por humedal y salar completo.
- Método `mosaic-v2;geometry-sha256=...`: conserva el array/ABI y añade compromiso geométrico en el hash. Para `sceneId=mosaic:...`, resolver IDs STAC individuales mediante procedencia. Ver actualización de `INTERFACES.md`.
- Doce pruebas de software y casos Sentinel-2 reales: Olaroz/Jujuy y Arizaro/Salta; tres años en Hombre Muerto con 35 mediciones válidas y 36 mosaicos de salar, un hueco de calidad explícito. El dry-run de I3 valida los hashes.

**Sol:** ejecutar `npm run serve -w @vega/processing` (API en 8787). Consumir `salarFrames` para la reproducción del salar y `frames` por humedal; PNG con bbox EPSG:4326, fecha y escenas. Cliente de ejemplo en `processing/src/client.ts`.

**Gaby:** configuración, persistencia, CORS, descarga del array `/measurements` y Dockerfile en `processing/`. Docker no está instalado en este entorno: validar imagen en la infraestructura de I3. El servicio no transmite transacciones; nuevos IDs requieren revisar umbrales con Igna.

**Demo:** una corrida fría de tres años tardó unos 18 minutos aquí. Prepararla antes y reutilizar el resultado/caché con su fecha visible. `npm run export -w @vega/processing -- <id> <directorio>` genera respaldo offline de registros e imágenes. No presentar una caché como análisis recién ejecutado.

Quedan en sus responsables la integración UI, el despliegue y la publicación. Los límites cartográficos y umbrales ambientales siguen sujetos a revisión; NDWI no demuestra volumen, contaminación ni causalidad minera.

## 🎯 Frontend: estado y checklist para cerrar la demo (relevado 11/11)

**Estado actual:** `npm run build -w @vega/frontend` OK y 4/4 tests. Funciona en modo `mock`. Al relevarlo, el contrato en Fuji tenía **0 mediciones** en los humedales 1, 2 y 3, así que el modo `chain` hoy se ve vacío.

**Ya hecho:** landing completa · mapa Leaflet con los 3 humedales y autoencuadre · gráfico NDWI con línea de umbral · botón Verificar (hash más campos on-chain, con estados ✔/✘/sin registro/error) · panel de análisis GeoJSON contra la API de I2 (`:8787`) con fotogramas Sentinel-2 · `source.ts` con modos `mock` y `chain`.

### Bloqueante (antes que todo)
- [ ] **I3/I1:** contrastar los 105 txHash declarados con Fuji y verificar `getMeasurements` por ID. No confundir `published.json` con confirmación on-chain.
- [ ] **I3:** pasar a I4 el `txHash` de al menos un `WaterAlert` real (es el `[[TX_WATERALERT]]` del pitch).

### I4 · Mínimo para el video
- [ ] Probar `VITE_DATA_SOURCE=chain npm run dev:front` contra Fuji con los datos ya publicados.
- [ ] Panel **"Alertas públicas"**: `registry.queryFilter("WaterAlert", DEPLOY_BLOCK)` (está como TODO en `source.ts`), con fecha, humedal, NDWI, umbral y link a la tx en Snowscan.
- [ ] Toggle **"simular dato alterado"**: modifica el NDWI off-chain y Verificar debe mostrar ✘.
- [ ] **Tabla de mediciones**: fecha, NDWI, escena, hash abreviado, link a la tx y Verificar por fila (hoy solo se verifica la última).
- [ ] Footer con la atribución **"Copernicus Sentinel data 2023-2025"** y la dirección del contrato enlazada a https://testnet.snowscan.xyz/address/0xbed76c9b117ec31022ae7f07b0982545c16d1dd5

### I4 · Importante
- [ ] En el gráfico, puntos bajo el umbral en rojo.
- [ ] Estados de carga y error del RPC, con fallback a mock si se cae la red (y un aviso visible de que es mock).
- [ ] Polígonos coloreados según estado (normal / en alerta); capa satelital (NASA GIBS o Esri World Imagery) en lugar de OSM.
- [ ] Soportar **MultiPolygon** (el backend ya lo acepta desde `i2/sdd-sentinel2`): tipos en `source.ts` y `analysis-geojson.ts`, y el encuadre en `WetlandMap.tsx`.

### Opcional
- [ ] Selector de salar del catálogo regional (`GET /api/salars`, `/api/salars/:id/wetlands`) en vez de solo subir GeoJSON.
- [ ] Reproducción de `salarFrames` (play/pausa), ver `processing/API.md`.

### Deploy y entrega
- [ ] Deploy en Vercel con `VITE_DATA_SOURCE=chain` (coordinar con I3). El análisis GeoJSON solo funciona si la API de I2 está publicada con HTTPS y CORS (`VITE_ANALYSIS_API_URL`); si no, ocultarlo o marcarlo como "solo local".
- [ ] Probar desde otro dispositivo o red.
- [ ] Video demo (1 a 3 min) siguiendo el guion de `docs/roadmap/4-frontend.md`; tener a mano la tx de respaldo.
