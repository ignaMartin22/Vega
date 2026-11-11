# Pitch: guion y contenido

> Responsable: **I1**. Este documento define el **contenido**: qué dice cada slide y qué se dice en voz. El **diseño visual** se hace después en Gamma, siguiendo el manual de marca.
> Orden pedido por el README: problema → solución → cómo funciona → **por qué blockchain** → demo → modelo → próximos pasos y fuentes.
> Duración de referencia: **3 minutos** hablados *(confirmar con la organización cuánto dura el pitch)*.

**Huecos a completar** (buscá `[[...]]`):

| Hueco | Quién | Cuándo |
|---|---|---|
| `[[SALAR]]`: nombre del salar y de los humedales | I2 | hito H2 |
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
- Humedales de `[[SALAR]]` con umbral de alerta propio cada uno

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
- `[[CAPTURA_MAPA]]`: mapa con los humedales de `[[SALAR]]`
- `[[GRAFICO_NDWI]]`: serie histórica con la línea de umbral
- **Alerta real on-chain:** `[[TX_WATERALERT]]`
- Botón **"Verificar"**: ✔ coincide con lo registrado en Avalanche. Si se altera el dato: ✘
- Video completo: `[[VIDEO]]`

**Se dice:**
> "Esta es la serie real de `[[SALAR]]` en los últimos años. Cada punto es una transacción en Avalanche. Acá el humedal cruzó el umbral y el contrato emitió la alerta: este es el link en el explorer. Y si alguien modifica un valor, la verificación lo detecta en el momento."

---

## Slide 6 · Modelo de negocio (≈20 s)

**Título:** Dato ambiental verificable para exportar litio

**En pantalla:**

| Quién | Qué obtiene | Paga |
|---|---|---|
| **Mineras exportadoras** | Prueba de cuidado del agua ante compradores y bancos | Suscripción por salar monitoreado (orientativo: **USD 500–2.000/mes**) |
| **Compradores y traders de litio** | Debida diligencia ambiental de sus proveedores | Acceso a reportes verificados |
| **Bancos y fondos** | Monitoreo creíble para evaluar el riesgo de un proyecto | Reportes |
| **Comunidades, ONGs y Estado** | Control independiente | **Gratis**, y eso es lo que le da credibilidad al dato |

**Posicionamiento:** *"dato ambiental verificable para exportar litio"*, no *"vigilar a la minera"*.

**Se dice:**
> "No vendemos vigilancia: vendemos confianza. A la minera le conviene pagar porque le abre mercados que piden pruebas ambientales. Y el acceso gratuito para las comunidades es justamente lo que hace que el dato valga."

---

## Slide 7 · Próximos pasos, fuentes y cierre (≈25 s)

**Título:** De un salar a toda la Puna

**En pantalla:**
- **Próxima etapa:**
  - Varios relayers de distintas partes, con mediana o quórum en el contrato
  - **L1 propia de Avalanche** donde comunidad, universidad y empresa sean los validadores
  - Más salares, Landsat para series largas, sensores en campo y reportes para auditorías
- **Equipo:** `[[EQUIPO]]`
- **Atribución (obligatoria):**
  - Contains modified Copernicus Sentinel data 2026, processed by Vega
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
| ¿El NDWI alcanza para medir el agua? | Es un indicador de **superficie con agua** en humedales, no de agua subterránea. Sirve como alerta temprana pública. La siguiente etapa suma sensores en campo y otras fuentes. |
| ¿Cuánto cuesta operar on-chain? | El deploy del contrato en Fuji costó menos de 0,0001 AVAX de prueba. `[[COSTO_POR_MEDICION]]`: medirlo con la serie real (I3). |
| ¿Por qué pagaría una minera? | Los compradores (automotrices, fabricantes de baterías) exigen cada vez más debida diligencia ambiental. Un dato que nadie puede manipular le sirve más que un estudio propio. |
| ¿Qué pasa con la privacidad o los datos de las comunidades? | No se registran datos personales: solo índices satelitales de superficie, que ya son públicos. |

---

## Notas para el armado en Gamma

- Crear con **"Pegar texto"** y separar las tarjetas con una línea `---` (como en este documento, de Slide 1 a Slide 7). Dejar afuera la tabla de huecos, las notas "Se dice" y las preguntas del jurado: las notas van como **notas del orador**.
- **Una idea por slide.** La slide 4 es la más evaluada (criterio "Justificación de blockchain"): darle más espacio visual.
- Aplicar la **paleta, tipografía y logo del manual de marca** cuando esté listo. Este documento no fija estética.
- El mapa y el gráfico tienen que ser **capturas reales**, no ilustraciones.
- Incluir la **dirección del contrato** y el link verificado: el jurado valora que sea demostrable.
