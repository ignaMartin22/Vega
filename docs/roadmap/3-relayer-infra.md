# I3 · Relayer + Infra

**Sos dueño de:** `relayer/`, `sample-data/published.json`, `frontend/public/records.json`, el deploy en Oracle Cloud y en Vercel
**Entregás:** la serie real sellada en Fuji, al menos **un `WaterAlert` real** y la infraestructura de la demo
**No dependés de nadie:** probás contra un contrato local (Anvil) con los datos mock hasta que existan el contrato en Fuji y los datos reales.

## Día 1 · Mié 11

- [ ] `npm install` y `npm run mock`, luego `npm run dry -w @vega/relayer` (valida los 102 hashes mock)
- [ ] Wallet del relayer: usar la misma cuenta del hackathon que I1 o una nueva (si es nueva, pedirle a I1 `setPublisher`). Pedir AVAX en el faucet
- [ ] **Entorno local sin esperar a I1:** instalar Foundry, `anvil` en una terminal y desplegar `contracts/` localmente (`forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <clave de anvil>`)
- [ ] Correr el relayer contra Anvil (`FUJI_RPC_URL=http://127.0.0.1:8545`, `VEGA_REGISTRY_ADDRESS=<local>`) y confirmar que se emite `WaterAlert` en el humedal 2 del mock
- [ ] Mejorar el relayer:
  - [ ] mergear `published.json` con publicaciones anteriores (hoy se sobrescribe)
  - [ ] escribir `frontend/public/records.json` (registros off-chain para "Verificar")
  - [ ] reintentos y manejo de nonce si una tx falla; log claro con el link al explorer
  - [ ] flag `--only-wetland` / `--limit` para sellar de a poco en la demo
- [ ] Crear la VM **Oracle Cloud Always Free** (Ubuntu), instalar Node 22 y clonar el repo

## Día 2 · Jue 12

- [ ] Con el **H1** (contrato en Fuji): publicar 2 o 3 mediciones mock en Fuji para validar el camino completo
- [ ] Con el **H3** (datos reales): `MEASUREMENTS=sample-data/measurements.json npm run relay` → sellar toda la serie
- [ ] Confirmar al menos **un `WaterAlert` real** en el explorer y guardar el link → **Hito H4**
- [ ] Dejar en Oracle Cloud un servicio (cron o `systemd`) que corra el relayer y sirva `records.json` por HTTP (o, más simple, commitear `records.json` en `frontend/public/`)
- [ ] Desplegar el frontend en **Vercel** (root `frontend/`, variables `VITE_*` de `.env.example`)
- [ ] Guardar una **tx de respaldo** ya confirmada por si falla la red durante la demo

## Entrega

- [ ] `sample-data/published.json` con los hashes de tx reales
- [ ] Links (explorer, Vercel) para el README de I1 y el video de I4
- [ ] Durante la grabación del video: ejecutar una publicación en vivo

## Cómo trabajar sin esperar a otros

| Necesitás… | Usá… |
|---|---|
| Datos | `sample-data/measurements.mock.json` (mismos formato y hash que los reales) |
| Contrato | Anvil local con `contracts/` → luego `shared/deployments/fuji.json` |
| ABI | `shared/src/abi.ts` (ya está fija) |

**Lo que NO podés hacer sin avisar:** publicar registros que no pasen la validación de hash ni cambiar el formato de `published.json` o `records.json`.
