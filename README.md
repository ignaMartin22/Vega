# 💧 Vega

**Datos satelitales del agua de la Puna que nadie puede modificar.**
Confianza verificable entre la minería, las comunidades y los compradores de litio.

> **Hackathon Argentina Space 2026** · Salta, 11–13 de noviembre · **Track Blockchain Avalanche**
> **Categoría principal:** Geoespacial (un dato del espacio decide algo on-chain) · **Cruce:** RWA (trazabilidad ambiental del litio)
> ⏰ **Entrega:** viernes 13/11 a las **09:00** (hora de Argentina)

---

## 🧭 El problema: "X le pasa a Y"

> **A las comunidades de la Puna y a los compradores de litio les falta un dato confiable sobre el agua: hoy los estudios de impacto los genera la propia minera.**

En la Puna (Salta, Jujuy, Catamarca), la minería de litio y las comunidades compiten por el agua: vegas, lagunas y humedales cercanos a los salares.

- Los estudios de impacto ambiental los presenta **la propia empresa**. Las comunidades no confían en esos datos.
- El Estado tiene poca capacidad de control independiente.
- Los **compradores internacionales de litio** (automotrices y fabricantes de baterías, sobre todo los que venden en Europa) exigen cada vez más **pruebas ambientales creíbles** de su cadena de suministro.

**No existe hoy una fuente de datos sobre el agua en la que todas las partes confíen.**

## 💡 La solución

**Vega** monitorea por satélite los humedales cercanos a los salares y registra cada medición en **Avalanche**. Queda un **historial público, con fecha cierta e inmodificable**: no lo pueden alterar ni la empresa, ni el Estado, ni nosotros.

1. **Medimos.** Imágenes **Sentinel-2** (Copernicus, gratuitas) calculan el índice de agua **NDWI** de cada humedal.
2. **Sellamos.** El valor, la fecha, la escena de origen y el **hash** del dato se guardan on-chain.
3. **Alertamos y mostramos.** Si el NDWI cae bajo el umbral, el contrato emite una **alerta pública**. Un mapa muestra la evolución del humedal y un botón **"Verificar"** compara el dato con lo registrado en la cadena.

---

## ✅ Test de blockchain (las 4 preguntas)

| Pregunta | Respuesta de Vega |
|---|---|
| **1. ¿Quién desconfía de quién?** | Las **comunidades** desconfían de los datos de la **minera**. Los **compradores de litio** necesitan verificar a su **proveedor** sin depender de lo que este declare. El **Estado** no tiene datos propios. Son al menos 3 partes con intereses opuestos. |
| **2. ¿Qué evento dispara algo on-chain?** | **Cada medición satelital** queda registrada (dato + hash + fecha + fuente). **Cuando el NDWI de un humedal cae por debajo del umbral, el contrato emite una alerta pública** (`WaterAlert`) que nadie puede borrar. |
| **3. ¿Qué pasa si el dato miente?** | La fuente es **pública y reproducible**: cualquiera puede descargar la misma escena Sentinel-2 y recalcular el NDWI. On-chain guardamos el **hash del dato y el ID de la escena**, así que una manipulación se detecta al recalcular. En el MVP publica **un relayer**. En la siguiente etapa publican **varios relayers** de distintas partes (comunidad, universidad, empresa) y el contrato toma la **mediana**, o se usa una **L1 propia** donde esas partes son los validadores. |
| **4. ¿Quién paga o cobra, y cuánto?** | Pagan las **mineras** que exportan litio, con una **suscripción por salar monitoreado** (orientativo: USD 500–2.000/mes por salar), para mostrar cumplimiento ante compradores y bancos. Pagan también los **compradores y traders** por acceso a reportes verificados de sus proveedores. **Comunidades, ONGs y el Estado** acceden gratis al mapa público, y eso es lo que le da credibilidad al dato. |

### Evento on-chain (en una oración)

> **Cuando el relayer publica una medición de un humedal, el contrato guarda su hash y, si el NDWI está por debajo del umbral, emite `WaterAlert`.**

Función clave: `recordMeasurement(wetlandId, ndwi, sceneId, dataHash, timestamp)`

---

## 👥 Quién lo usa y por qué le conviene

| Actor | Para qué |
|---|---|
| **Mineras** | Probar ante compradores y bancos que cuidan el agua. Bajar la conflictividad y diferenciarse. |
| **Compradores de litio** | Debida diligencia ambiental verificable de sus proveedores. |
| **Comunidades y ONGs** | Controlar con datos que no dependen de la empresa. Sentinel es dato público. |
| **Estado provincial** | Fiscalizar sin depender de lo que declara cada empresa. |
| **Bancos y fondos** | Monitoreo ambiental creíble para evaluar el riesgo de un proyecto. |

**Posicionamiento:** *"dato ambiental verificable para exportar litio"*, no *"vigilar a la minera"*.

---

## 🛠️ Arquitectura

```
[1] FUENTE                 [2] QUIEN PUBLICA                 [3] CONTRATO
Sentinel-2 L2A    ──►   Relayer (Node.js)            ──►   VegaRegistry (Fuji C-Chain)
(Earth Search STAC)      · busca escenas del humedal         · guarda medición + hash
                         · calcula NDWI por polígono         · emite WaterAlert si NDWI < umbral
                         · hashea el registro (keccak256)
                         · firma la tx con ethers.js
                                                                     │
                                                                     ▼
                                                  Frontend: mapa + serie histórica + "Verificar"
```

### Contrato `VegaRegistry` (Solidity)

- `struct Measurement { uint32 wetlandId; int32 ndwi; string sceneId; bytes32 dataHash; uint64 timestamp; }`. El NDWI se guarda ×10.000 como entero.
- `recordMeasurement(...)`: solo puede llamarla un **publicador autorizado** (allowlist).
- `setThreshold(wetlandId, threshold)`: umbral por humedal.
- `event MeasurementRecorded(...)` y `event WaterAlert(wetlandId, ndwi, threshold, timestamp)`.
- `getMeasurements(wetlandId)`: historial para el frontend.

Punto de partida: el contrato de ejemplo `ThresholdAlert` de la guía del track.

---

## 🧰 Tecnologías

| Capa | Tecnología |
|---|---|
| **Blockchain** | Avalanche **Fuji C-Chain** (Chain ID `43113`, RPC `https://api.avax-test.network/ext/bc/C/rpc`) |
| **Smart contracts** | Solidity + **Foundry** (o Hardhat). Remix como plan B para desplegar rápido. |
| **Wallet** | **Core Wallet** (cuenta exclusiva para el hackathon) + faucet de **Builder Hub** |
| **Datos satelitales** | **Sentinel-2 L2A** vía **Earth Search STAC** (`https://earth-search.aws.element84.com/v1`, sin API key). **Copernicus Browser** para validar a ojo. |
| **Procesamiento** | Node.js (TypeScript) con `geotiff` para leer las bandas COG. Alternativa: Python con `pystac-client` y `rasterio`. **NDWI = (B03 − B08) / (B03 + B08)** |
| **Relayer** | Node.js + **ethers.js v6** |
| **Backend / hosting** | **Oracle Cloud** (Always Free VM), sponsor del track |
| **Frontend** | React + Vite, **Leaflet** (mapa, polígonos), **Chart.js** (serie NDWI), ethers.js (lectura del contrato) |
| **Capa base del mapa** | NASA GIBS o Sentinel-2 true color |
| **Pitch** | Gamma |

---

## 🎯 MVP: qué entra y qué no

**✅ Entra**
1. **Un salar real** con 2 o 3 humedales (polígonos GeoJSON) y su **serie histórica de NDWI**.
2. **Contrato `VegaRegistry` desplegado en Fuji** + relayer que **sella mediciones reales** y dispara `WaterAlert`.
3. **Mapa público** con línea de tiempo y botón **"Verificar"** (recalcula el hash y lo compara con el on-chain).

**❌ No entra (próximas etapas)**
1. L1 propia de Avalanche con validadores multiparte.
2. Varios relayers con mediana o quórum, o Chainlink Functions.
3. Más salares, Landsat para series largas, sensores en campo y reportes para auditorías.

---

## 🗂️ Estructura del repo y equipo

```
contracts/    Solidity + Foundry: VegaRegistry, tests y deploy              → I1 Contratos
processing/   Sentinel-2 (STAC) → NDWI → registros hasheados                → I2 Datos
relayer/      sella las mediciones en Fuji con ethers.js                    → I3 Relayer + Infra
frontend/     React + Vite + Leaflet + Chart.js, botón "Verificar"          → I4 Frontend
shared/       tipos, hash canónico, ABI y dirección del deploy (de todos)
sample-data/  humedales GeoJSON, mediciones mock/reales, respuestas de APIs
docs/         reparto de roles, interfaces y roadmap por integrante
```

- **Reparto de tareas y línea de tiempo:** [`docs/ROLES.md`](docs/ROLES.md)
- **Interfaces congeladas entre módulos:** [`docs/INTERFACES.md`](docs/INTERFACES.md)
- **Roadmap individual:** [`docs/roadmap/`](docs/roadmap/)
- **Avances y próximos pasos por integrante:** [`docs/AVANCES.md`](docs/AVANCES.md)

```bash
npm install          # instala todos los workspaces (Node 20+)
npm run mock         # genera sample-data/measurements.mock.json
npm run dev:front    # frontend en modo mock → http://localhost:5173
npm run dry -w @vega/relayer   # valida los hashes sin enviar tx
npm run typecheck    # antes de cada merge
cp .env.example .env # variables (PRIVATE_KEY solo de la cuenta del hackathon)
```

---

## 🚀 Pasos de desarrollo

### Día 1 (miércoles 11): setup y contrato
- [x] Crear el repo y la estructura: `contracts/`, `relayer/`, `frontend/`, `sample-data/`
- [x] Instalar **Core Wallet**, crear una cuenta solo para el hackathon y agregar la red **Fuji**
- [x] Pedir AVAX de prueba en el **faucet de Builder Hub**
- [ ] Elegir el salar y dibujar los polígonos de 2 o 3 humedales en GeoJSON (geojson.io + Copernicus Browser)
- [ ] Probar **Earth Search STAC**: buscar escenas Sentinel-2 del polígono con `eo:cloud_cover < 20` y guardar la respuesta en `sample-data/`
- [x] Escribir `VegaRegistry.sol` y sus tests en Foundry
- [x] **Desplegar en Fuji temprano** y guardar la dirección y el link al explorer

### Día 2 (jueves 12): datos, relayer y frontend
- [ ] Script de NDWI: descargar las bandas B03 y B08 (COG) del polígono y calcular el NDWI medio
- [ ] Generar la **serie histórica** (por ejemplo, una escena por mes de los últimos 2 o 3 años)
- [ ] Relayer: armar el registro JSON → `keccak256` → `recordMeasurement()` firmado con ethers.js
- [ ] Sellar la serie histórica on-chain y forzar al menos **un `WaterAlert` real**
- [ ] Frontend: mapa Leaflet con polígonos, gráfico NDWI y lectura de eventos del contrato
- [ ] Botón **"Verificar"**: recalcular el hash del registro y compararlo con el on-chain
- [ ] Desplegar el backend y el relayer en **Oracle Cloud**, y el frontend en Vercel

### Noche del día 2 o antes de las 09:00 del viernes 13: entrega
- [ ] **Pitch deck (5 a 7 slides):** problema → solución → cómo funciona (dato → relayer → contrato) → **por qué blockchain** → demo → modelo (quién paga) → próximos pasos y fuentes
- [ ] **Video demo (1 a 3 min):** problema, el dato entrando, la tx en el explorer de Fuji y la verificación. Usar 1080p, notificaciones apagadas y tener una tx de respaldo.
- [ ] README final con la dirección del contrato y los links
- [ ] `sample-data/` con respuestas reales de cada API (plan B si falla internet)

---

## 📦 Checklist de entrega (antes del 13/11, 09:00)

- [x] **Contrato desplegado en Fuji** + link al explorer → [`0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5`](https://explorer-test.avax.network/c-chain/address/0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5)
- [ ] **Video demo** con una acción on-chain → *(link)*
- [ ] **Pitch deck** con la slide "por qué blockchain" → *(link)*
- [ ] **Repo** → este repositorio
- [ ] **Atribución** de las fuentes de datos (ver abajo)

## 📊 Criterios de evaluación: cómo los cubrimos

| Criterio | Vega |
|---|---|
| **Impacto** | El agua en la Puna es un problema real del NOA. Pagan las mineras exportadoras y los compradores. |
| **Creatividad** | Cruza dato satelital público con un registro inmutable multiparte para resolver un conflicto de confianza. |
| **Validez** | Contrato en Fuji, mediciones reales de Sentinel-2 y alerta on-chain demostrable. |
| **Justificación de blockchain** | Responde las 4 preguntas, incluida qué pasa si el dato miente. |
| **Presentación** | Video, pitch y atribución de fuentes. |

---

## 🎤 Pitch en una frase

> **"Vega: datos satelitales del agua de la Puna que nadie puede modificar. Confianza verificable entre la minería, las comunidades y los compradores."**

---

## 📚 Atribución de datos

- Contains modified Copernicus Sentinel data 2026, processed by Vega.
- Imágenes de mapa base: NASA Global Imagery Browse Services (GIBS), parte de NASA ESDIS.
- Cartografía base: Natural Earth (dominio público).
- Acceso a Sentinel-2 vía Earth Search (Element 84) sobre AWS Open Data.

## 🔗 Recursos

- Guía del track: https://avalanche-track.vercel.app/guia
- Avalanche Docs: https://docs.avax.network · Avalanche Academy · Builder Hub
- Explorer Fuji: https://explorer-test.avax.network/c-chain
- Earth Search STAC: https://earth-search.aws.element84.com/v1
- Copernicus Browser: https://browser.dataspace.copernicus.eu

---

*Vega: por las vegas de la Puna, los humedales que queremos cuidar.*
