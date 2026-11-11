# División de responsabilidades: equipo Vega (4 integrantes)

**Objetivo:** que cada integrante avance **en paralelo y sin depender de otro**. Para lograrlo:

1. **Cada uno es dueño de una carpeta.** Solo el dueño la modifica (los demás abren un issue o avisan).
2. **Las interfaces ya están fijadas** en [`INTERFACES.md`](INTERFACES.md) y en `shared/` (tipos, hash, ABI). Nadie programa contra el código de otro, sino contra esas interfaces.
3. **Todos arrancan con mocks.** `sample-data/measurements.mock.json` tiene el formato y los hashes reales, el frontend tiene modo `mock` y el relayer puede probar contra Anvil local. Nadie queda bloqueado esperando el deploy o los datos reales.
4. **La integración es cambiar un archivo, no una persona:** cuando I1 escribe `fuji.json` o I2 escribe `measurements.json`, los demás pasan de mock a real con una variable.

## Primeros pasos (cada integrante, una sola vez)

```bash
git checkout main && git pull origin main
git checkout -b i1/contratos        # o i2/datos, i3/relayer, i4/frontend
npm install                         # Node 20 o más nuevo
npm run mock                        # genera sample-data/measurements.mock.json
cp .env.example .env                # completar solo lo que use tu rol (nunca se commitea)
npm run typecheck                   # verificar que todo anda: no debe mostrar errores
```

Después abrí tu roadmap en [`roadmap/`](roadmap/) y seguí el Día 1. Para ver el frontend: `npm run dev:front` → http://localhost:5173

## Asignación

| | Rol | Carpeta (dueño) | Entrega principal | Extra de entrega |
|---|---|---|---|---|
| **I1** | Contratos / Blockchain | `contracts/`, `shared/deployments/` | `VegaRegistry` testeado y **desplegado en Fuji** | **Pitch deck** (Gamma) + README final |
| **I2** | Datos satelitales | `processing/`, `sample-data/wetlands.geojson`, `sample-data/stac/` | Serie histórica real de NDWI en `measurements.json` | Slide y fuentes de datos, **atribución** |
| **I3** | Relayer + Infra | `relayer/`, deploy en Oracle Cloud / Vercel | Mediciones reales **selladas on-chain** y al menos **un `WaterAlert` real** | Plan B offline y **tx de respaldo** para la demo |
| **I4** | Frontend | `frontend/` | Mapa + gráfico + **botón Verificar** leyendo Fuji | **Video demo** (1–3 min) |

`shared/` es de todos, pero solo se modifica avisando en el grupo (ver INTERFACES.md).

## Roadmaps individuales

- [I1 · Contratos](roadmap/1-contratos.md)
- [I2 · Datos satelitales](roadmap/2-datos.md)
- [I3 · Relayer + Infra](roadmap/3-relayer-infra.md)
- [I4 · Frontend](roadmap/4-frontend.md)

Avances y próximos pasos: [`AVANCES.md`](AVANCES.md)

## Línea de tiempo común

| Hito | Cuándo | Qué cambia para los demás |
|---|---|---|
| **H0 · Setup** | Mié 11, al terminar la mañana | Todos corren `npm install` y `npm run mock`. Cada uno trabaja en su carpeta. |
| **H1 · Contrato en Fuji** (I1) | Mié 11, noche | `shared/deployments/fuji.json` tiene la dirección → I3 publica en Fuji y I4 prueba `VITE_DATA_SOURCE=chain` |
| **H2 · Humedales reales** (I2) | Mié 11, noche | `wetlands.geojson` real → I4 ve los polígonos reales en el mapa |
| **H3 · Serie NDWI real** (I2) | Jue 12, mediodía | `measurements.json` real → I3 la sella on-chain |
| **H4 · Serie sellada + WaterAlert** (I3) | Jue 12, tarde | `published.json` + `records.json` → I4 muestra datos on-chain y verifica |
| **H5 · Congelamiento** | Jue 12, 22:00 | No más features. Solo bugs, video y pitch. |
| **Entrega** | **Vie 13, 09:00** | Contrato + video + pitch + repo + atribución |

Ningún hito **bloquea**: si H1 o H3 se atrasan, los demás siguen con mocks y la integración se hace cuando llegue.

## Reglas de trabajo

- **Ramas:** `i1/contratos`, `i2/datos`, `i3/relayer`, `i4/frontend`. PR o merge a `main` a menudo (al menos en cada hito). Como cada uno toca su carpeta, casi no habrá conflictos.
- **Mantenerse al día:** antes de cada bloque de trabajo, `git pull origin main` en tu rama (o `git merge main`). Mergear a `main` seguido, como mínimo en cada hito.
- **`package-lock.json` es uno solo para todo el monorepo** y es el conflicto más probable si dos personas agregan dependencias. Si aparece, **no resolverlo a mano**: `git checkout main -- package-lock.json && npm install`, y commitear el lockfile regenerado. Agregá dependencias solo en tu workspace: `npm install <paquete> -w @vega/<tu-paquete>`.
- **`package.json` de la raíz y `README.md`:** avisá si agregás un script. El README final es de I1: pasale tus links en vez de editarlo.
- **Commits** chicos y en español: `contracts: agrega evento WaterAlert`.
- **Antes de mergear:** `npm run typecheck` desde la raíz (I1: además `forge test`).
- **Secretos:** solo en `.env` (está en `.gitignore`). Nunca pegar la `PRIVATE_KEY` en el chat ni en el código.
- **Sync de 10 minutos** en cada hito: qué terminé, qué publiqué, qué necesito. No hace falta más coordinación que eso.

## Checklist final (responsable)

- [x] Contrato desplegado + link al explorer en el README (**I1**)
- [ ] Pitch deck 5–7 slides con "por qué blockchain" (**I1**, con aportes de todos)
- [ ] Atribución de fuentes de datos en README y pitch (**I2**)
- [ ] `sample-data/` con respuestas reales de cada API (**I2** STAC, **I3** tx/published)
- [ ] Al menos un `WaterAlert` real en Fuji + tx de respaldo (**I3**)
- [ ] Frontend desplegado en Vercel (**I3** deploy, **I4** build)
- [ ] Video demo 1080p (**I4**, con la tx de **I3**)
