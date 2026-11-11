# Avances del equipo

Registro de lo terminado y de lo que cada integrante puede hacer a partir de eso. Cada uno agrega su sección al completar un hito.

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
