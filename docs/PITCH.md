# Pitch: guion y contenido

> Responsable: **I1**. Este documento define el **contenido**: qué dice cada slide y qué se dice en voz. El **diseño visual** se hace después en Gamma, siguiendo el manual de marca.
> Orden pedido por el README: problema → solución → cómo funciona → **por qué blockchain** → demo → modelo → próximos pasos y fuentes.
> Duración de referencia: **3 minutos** hablados *(confirmar con la organización cuánto dura el pitch)*.

**Huecos a completar** (buscá `[[...]]`):

| Hueco | Quién | Cuándo |
|---|---|---|
| `[[GRAFICO_NDWI]]`: captura de la serie real con el umbral | I2 / I4 | hito H3/H4 |
| `[[TX_WATERALERT]]`: link a la tx de un `WaterAlert` real | I3 | hito H4 |
| `[[CAPTURA_MAPA]]`: mapa con polígonos y el botón "Verificar" | I4 | hito H4 |
| `[[VIDEO]]`: link al video demo | I4 | viernes antes de las 09:00 |
| `[[EQUIPO]]`: nombres y roles | todos | cuando quieran |

---

## Slide 1 · Problema (≈30 s)

**Título:** El agua de la Puna no tiene un dato en el que todos confíen

**En pantalla:**
- En la Puna, la minería de litio y las comunidades compiten por el agua de vegas, lagunas y humedales.
- Los estudios de impacto ambiental **los presenta la propia minera**.
- El Estado tiene **poca capacidad de control** independiente.
- Los **compradores internacionales de litio** exigen pruebas ambientales creíbles de su cadena de suministro.

**Frase fuerza:** *Hoy no existe una fuente de datos sobre el agua en la que todas las partes confíen.*

**Visual sugerido:** foto o imagen satelital de una vega junto a un salar; tres actores (comunidad, minera, comprador) con signos de pregunta entre ellos.

**Se dice:**
> "En la Puna, el litio y el agua están en el mismo lugar. Las comunidades necesitan saber si sus vegas se están secando, y los compradores de litio necesitan probar que su proveedor cuida el agua. Pero el único dato disponible es el que genera la propia minera. Nadie le cree a nadie, y no hay un dato neutral."

---

## Slide 2 · Solución (≈25 s)

**Título:** Vega: datos satelitales del agua que nadie puede modificar

**En pantalla (3 pasos):**
1. **Medimos.** Imágenes Sentinel-2 (Copernicus, públicas y gratuitas) calculan el índice de agua **NDWI** de cada humedal.
2. **Sellamos.** El valor, la fecha, la escena de origen y el **hash** del dato se guardan en **Avalanche**.
3. **Alertamos y mostramos.** Si el agua cae bajo el umbral, el contrato emite una **alerta pública**. Un mapa muestra la historia de cada humedal, con un botón **"Verificar"**.

**Visual sugerido:** satélite → candado/cadena → mapa con alerta.

**Se dice:**
> "Vega mira los humedales desde el espacio, con datos que cualquiera puede descargar, y registra cada medición en Avalanche. Queda un historial público, con fecha cierta, que no pueden alterar ni la empresa, ni el Estado, ni nosotros."

---

## Slide 3 · Cómo funciona (≈30 s)

**Título:** Del satélite a la cadena, sin intermediarios de confianza

**En pantalla (diagrama de 4 bloques):**

```
Sentinel-2 L2A  ──►  Relayer  ──►  VegaRegistry (Avalanche)  ──►  Mapa público
(Earth Search)       NDWI por      guarda medición + hash         serie histórica
                     humedal,      emite WaterAlert si            + botón "Verificar"
                     hash y firma  NDWI < umbral
```

**Datos reales para mostrar:**
- Contrato `VegaRegistry` desplegado y **verificado** en Avalanche Fuji: `0xBeD76C9B117eC31022aE7f07B0982545C16D1DD5`
- Código público: https://testnet.snowscan.xyz/address/0xbed76c9b117ec31022ae7f07b0982545c16d1dd5#code
- Fórmula: **NDWI = (B03 − B08) / (B03 + B08)**, promedio por humedal, con nubes enmascaradas
- Humedales del Salar del Hombre Muerto con umbral de alerta propio cada uno

**Se dice:**
> "Tomamos la escena satelital, calculamos cuánta agua hay en cada humedal y generamos una huella digital del dato. El relayer la firma y la manda al contrato. Si el agua cae por debajo del umbral, el contrato dispara una alerta que nadie puede borrar."

---

## Slide 4 · Por qué blockchain (≈40 s): la slide más importante

**Título:** ¿Por qué blockchain y no una base de datos?

**En pantalla (4 preguntas, 4 respuestas cortas):**

| Pregunta | Vega |
|---|---|
| **¿Quién desconfía de quién?** | Las comunidades desconfían de la minera, los compradores necesitan verificar a su proveedor y el Estado no tiene datos propios. **Son 3 partes con intereses opuestos.** |
| **¿Qué evento dispara algo on-chain?** | Cada medición satelital queda sellada. **Si el NDWI cae bajo el umbral, el contrato emite `WaterAlert`.** |
| **¿Qué pasa si el dato miente?** | La fuente es **pública y reproducible**: cualquiera recalcula el NDWI desde la misma escena y lo compara con el hash on-chain. **Siguiente etapa:** varios relayers (comunidad, universidad, empresa) y el contrato toma la **mediana**. |
| **¿Quién paga?** | Las mineras exportadoras, para demostrar cumplimiento. Comunidades, ONGs y el Estado lo usan **gratis**. |

**Frase fuerza:** *Una base de datos la controla alguien. Este registro no lo controla ninguna de las partes en conflicto.*

**Se dice:**
> "Si guardáramos esto en nuestra base de datos, habría que confiar en nosotros. Blockchain resuelve un problema de confianza entre tres partes que no se creen entre sí. Y si alguien duda del dato, no tiene que creernos: descarga la misma imagen de Copernicus, recalcula y compara con lo que está en la cadena."

---

## Slide 5 · Demo (≈30 s, o el video)

**Título:** Funciona hoy, con datos reales

**En pantalla:**
- `[[CAPTURA_MAPA]]`: mapa con los humedales del Salar del Hombre Muerto
- `[[GRAFICO_NDWI]]`: serie histórica con la línea de umbral
- **Alerta pública on-chain:** `[[TX_WATERALERT]]`. Se presenta como prueba de que **el mecanismo funciona** (la alerta queda pública e imborrable), **no** como prueba de daño ambiental ni de su causa. Los umbrales del MVP son provisionales.
- Botón **"Verificar"**: ✔ coincide con lo registrado en Avalanche. Si se altera el dato: ✘
- Video completo: `[[VIDEO]]`

**Se dice:**
> "Esta es la serie real del Salar del Hombre Muerto entre 2023 y 2025: 105 mediciones de tres humedales. Cada punto es una transacción en Avalanche. Cuando un valor cruzó el umbral, el contrato emitió una alerta pública que nadie puede borrar: este es el link en el explorer. La alerta no dice quién tiene la culpa; dice que hay que mirar ese humedal, y que ese aviso queda a la vista de todos. Y si alguien modifica un valor, la verificación lo detecta en el momento."

---

## Slide 6 · Modelo de negocio (≈20 s)

**Título:** La minera paga por un dato que no puede tocar

**Idea central:** la minera le paga a Vega para que un tercero neutral (el satélite y la blockchain) certifique que cuida el agua, porque a ella sola nadie le cree.

**En pantalla (flujo de valor):**

```
Comprador de litio exige pruebas ambientales
        ▼
La minera no puede usar su propio estudio (nadie le cree)
        ▼
Paga a Vega → dato satelital sellado que NO puede modificar
        ▼
Lo muestra a compradores, bancos e inversores → vende y se financia mejor
```

| Quién | Qué obtiene | Paga |
|---|---|---|
| **Mineras exportadoras** | Monitoreo continuo, alertas y reportes verificables para mostrar a compradores y bancos | **Suscripción por salar** (orientativo: USD 500–2.000/mes) |
| **Compradores de litio** (automotrices, baterías) | Reportes de todos sus proveedores en un lugar, para su debida diligencia | Acceso a reportes |
| **Comunidades, ONGs y Estado** | Control independiente con el mismo dato | **Gratis** |

**Por qué es gratis para las comunidades:** si solo la minera viera el dato, sería otro dato de la minera. Que lo vean también quienes desconfían de ella es lo que lo vuelve creíble. **Lo gratuito es parte del producto que compra la minera.**

**Costos casi nulos:**
- Imágenes Sentinel-2: gratis
- Sellar una medición en Avalanche: ≈ 0,0013 AVAX (fracción de centavo de dólar)
- Un salar entero on-chain: **pocos dólares al año**

**Posicionamiento:** *"dato ambiental verificable para exportar litio"*, no *"vigilar a la minera"*.

**Se dice:**
> "No vendemos vigilancia: vendemos confianza. La minera necesita demostrarles a sus compradores que cuida el agua, y su propio estudio no le alcanza. Con Vega paga por un dato que no puede modificar: puede dejar de pagar, pero no puede borrar lo que ya quedó registrado. Las comunidades acceden gratis, y eso es justamente lo que le da valor a lo que compra la minera. Y operarlo cuesta casi nada: sellar un salar entero en Avalanche sale unos pocos dólares al año."

---

## Slide 7 · Próximos pasos, fuentes y cierre (≈25 s)

**Título:** De un salar a toda la Puna

**En pantalla:**
- **Próxima etapa:**
  - Varios relayers de distintas partes, con mediana o quórum en el contrato
  - **L1 propia de Avalanche** donde comunidad, universidad y empresa sean los validadores
  - **Triangulación de fuentes:** sellar también los sensores de la minera (piezómetros, caudales) y mediciones de campo, para contrastarlos públicamente con el satélite
  - **Validación científica:** umbrales calibrados con hidrólogos y universidades, y alertas por anomalía frente al mismo mes de años anteriores
  - Más salares, Landsat y Sentinel-1 (radar) para series largas y sin nubes, y reportes para auditorías
- **Equipo:** `[[EQUIPO]]`
- **Atribución (obligatoria):**
  - Contains modified Copernicus Sentinel data 2023-2025, processed by Vega
  - Mapa base: NASA Global Imagery Browse Services (GIBS), parte de NASA ESDIS
  - Acceso a Sentinel-2 vía Earth Search (Element 84) sobre AWS Open Data
  - Cartografía base: Natural Earth (dominio público)

**Frase de cierre (en pantalla y en voz):**
> **"Vega: datos satelitales del agua de la Puna que nadie puede modificar. Confianza verificable entre la minería, las comunidades y los compradores."**

---

## Preguntas probables del jurado (preparar respuestas)

| Pregunta | Respuesta corta |
|---|---|
| ¿Qué impide que el relayer publique datos falsos? | Hoy hay un solo relayer, pero el dato es **reproducible**: escena pública + hash on-chain, así que cualquiera puede auditarlo. El diseño escala a varios relayers con mediana, o a una L1 propia con validadores de cada parte. |
| ¿Por qué Avalanche? | Transacciones baratas y rápidas en la C-Chain (compatible con EVM), y la posibilidad de una **L1 propia** con validadores elegidos: comunidades, universidad y empresa. Encaja con la gobernanza multiparte. |
| ¿Y las nubes? | Usamos la capa de clasificación de escena (SCL) de Sentinel-2 para descartar nubes y sombras, y filtramos escenas con poca nubosidad (una por mes). |
| ¿El NDWI alcanza para medir el agua? | Es un indicador de **superficie con agua** en humedales, no de agua subterránea ni de volumen, y varía con la estación, las sales y la vegetación. Sirve como **alerta temprana pública**, no como prueba de causa. La siguiente etapa suma sensores en campo y otras fuentes. |
| ¿Cómo saben que el dato satelital es correcto? | Hay que separar dos cosas. **Integridad:** que nadie alteró el dato. Eso lo garantiza la blockchain. **Exactitud:** que el NDWI refleje el estado real del humedal. Eso depende del método, que es un índice estándar de teledetección, con código abierto y reproducible, y se valida contrastándolo con otros satélites, con verdad de campo y con expertos. **Vega certifica integridad y trazabilidad, no verdad ambiental por sí sola.** |
| ¿Coincide con lo que miden los sensores de la minera? | No tiene por qué coincidir en números: el satélite ve agua en superficie y los sensores suelen medir agua subterránea y caudales. Son **complementarios**. Próxima etapa: que la minera también selle sus lecturas on-chain. Si los sensores dicen "estable" y el satélite muestra que el humedal se achica, **la discrepancia queda pública**; si coinciden, la minera tiene una prueba más fuerte que cualquier estudio propio. |
| Entonces, ¿qué es exactamente el "certificado"? | Que **esta medición se hizo con este método, sobre esta imagen pública, en esta fecha, y no fue modificada**. La credibilidad sale de combinar fuentes independientes selladas y comparables, con el satélite como la fuente que no controla nadie. |
| ¿Cuánto cuesta operar on-chain? | Cada medición consume ≈170.000 de gas: **≈ 0,0013 AVAX en mainnet** (precio del gas de 7,5 gwei, medido el 11/11/2026; varía). Un salar con 3 humedales y una escena por mes son 36 tx al año, **≈ 0,05 AVAX al año**. Incluso midiendo en cada pasada del satélite (~220 tx al año) son ≈ 0,3 AVAX. |
| ¿Por qué pagaría una minera? | Los compradores (automotrices, fabricantes de baterías) exigen cada vez más debida diligencia ambiental. Un dato que nadie puede manipular le sirve más que un estudio propio. |
| Si la minera paga, ¿no controla el dato? | No. Puede pagar o dejar de pagar, pero **no puede modificar ni borrar** lo registrado: cada medición queda en la cadena para siempre y cualquiera la puede recalcular desde la imagen pública. Esa es la diferencia con contratar una consultora. |
| ¿Y si la minera deja de pagar? | Se deja de monitorear ese salar *desde Vega*, pero el historial queda on-chain. El código y los datos son públicos: una ONG, una universidad o el Estado pueden seguir corriendo el relayer. Con varios relayers (próxima etapa), el monitoreo no depende de un solo pagador. |
| ¿A una minera le conviene que la monitoreen? | Si cuida el agua, sí: es una **ventaja comercial** frente a otras mineras que no pueden demostrarlo. Por eso el posicionamiento es "dato verificable para exportar litio" y no "vigilar a la minera". |
| ¿De dónde salen los precios? | Son **orientativos**, una hipótesis a validar con clientes. Igual, como el costo operativo es casi nulo, el modelo funciona incluso con precios mucho más bajos. |
| ¿Qué pasa con la privacidad o los datos de las comunidades? | No se registran datos personales: solo índices satelitales de superficie, que ya son públicos. |

---

## Notas para el armado en Gamma

- Crear con **"Pegar texto"** y separar las tarjetas con una línea `---` (como en este documento, de Slide 1 a Slide 7). Dejar afuera la tabla de huecos, las notas "Se dice" y las preguntas del jurado: las notas van como **notas del orador**.
- **Una idea por slide.** La slide 4 es la más evaluada (criterio "Justificación de blockchain"): darle más espacio visual.
- Aplicar la **paleta, tipografía y logo del manual de marca** cuando esté listo. Este documento no fija estética.
- El mapa y el gráfico tienen que ser **capturas reales**, no ilustraciones.
- Incluir la **dirección del contrato** y el link verificado: el jurado valora que sea demostrable.
