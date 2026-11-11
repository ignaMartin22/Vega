# I1 · Contratos / Blockchain

**Sos dueño de:** `contracts/`, `shared/deployments/fuji.json`
**Entregás:** `VegaRegistry` testeado y desplegado en Fuji · pitch deck · README final
**No dependés de nadie:** la interfaz (`IVegaRegistry.sol`) ya está fijada y el esqueleto del contrato compila contra ella.

> **Estado (mié 11/11):** hito H1 completo. `VegaRegistry` en Fuji: `0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5`. Detalle y próximos pasos del equipo en [`../AVANCES.md`](../AVANCES.md).

## Día 1 · Mié 11

- [x] Instalar Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`) y `forge install foundry-rs/forge-std --no-git` dentro de `contracts/`
- [x] Instalar **Core Wallet**, crear una cuenta **solo para el hackathon** y agregar la red Fuji (Chain ID 43113)
- [x] Pedir AVAX de prueba en el faucet de **Builder Hub** (pedir de más: el relayer también necesita gas)
- [x] Revisar el ejemplo `ThresholdAlert` de la guía del track y ajustar `VegaRegistry.sol`
- [x] Decidir y documentar qué pasa si un humedal no tiene umbral (hoy `0` ⇒ nunca alerta). Opción: `mapping(uint32 => bool) hasThreshold`
- [x] Completar tests: solo owner en `setThreshold` y `setPublisher`, historial con N mediciones, evento `MeasurementRecorded`
- [x] `forge test -vv` en verde
- [x] **Deploy temprano en Fuji** con `script/Deploy.s.sol` (plan B: Remix + Core Wallet)
- [x] Completar `shared/deployments/fuji.json` (`address`, `deployBlock`, `deployTx`, `publisher`) y pushear → **Hito H1**
- [x] Verificar el contrato en el explorer (opcional, suma en la demo)

## Día 2 · Jue 12

- [ ] Si I3 usa una wallet distinta para el relayer: `setPublisher(relayer, true)`
- [ ] Ajustar umbrales con `setThreshold` si I2 lo pide tras ver los datos reales (no hace falta redeploy)
- [ ] (Opcional, si sobra tiempo) Preparar la narrativa de la próxima etapa: varios publishers + mediana, L1 propia
- [ ] **Pitch deck en Gamma (5 a 7 slides):** problema → solución → cómo funciona (dato → relayer → contrato) → **por qué blockchain (las 4 preguntas)** → demo → modelo de negocio → próximos pasos y fuentes
- [ ] Pedir a cada integrante 1 captura o dato para su slide

## Entrega · antes del Vie 13, 09:00

- [ ] README: dirección del contrato + link al explorer + links de video y pitch
- [ ] Revisar el checklist de `docs/ROLES.md`

## Cómo trabajar sin esperar a otros

| Necesitás… | Usá… |
|---|---|
| Mediciones para testear | Datos inventados en los tests de Foundry o `sample-data/measurements.mock.json` |
| Saber qué espera el frontend o el relayer | `shared/src/abi.ts`, que debe ser idéntico a `IVegaRegistry.sol` |

**Lo que NO podés hacer sin avisar:** cambiar firmas de funciones o eventos de `IVegaRegistry.sol`.
