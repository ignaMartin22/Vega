# Entrega del frontend de Vega

## Alcance

La landing institucional y la interfaz interactiva viven en `frontend/`. La landing presenta el propósito, las capacidades y el método de Vega; debajo conserva el explorador cartográfico, la importación GeoJSON y el panel de resultados.

La rama de esta entrega es `feat/frontend-landing-page` y su PR es [#8](https://github.com/ignaMartin22/Vega/pull/8). Este PR está apilado sobre el PR #7, que depende del contrato de API del PR #6. No integrar esta rama directamente sobre `main` sin resolver primero ese orden de dependencias y revisar los PRs correspondientes.

## Ejecutar localmente

Requisitos: Node.js 20 o superior y npm.

Desde la raíz del repositorio:

```bash
npm ci
npm run serve -w @vega/processing
```

En otra terminal, desde la raíz:

```bash
npm run dev:front
```

Vite sirve el frontend normalmente en `http://localhost:5173`; el servicio de análisis local escucha en `http://127.0.0.1:8787`.

Para cambiar la URL del servicio, definir `VITE_ANALYSIS_API_URL` en el entorno de Vite (el proyecto lee el archivo `.env` de la raíz mediante `frontend/vite.config.ts`). No configurar una URL pública hasta tener un backend desplegado, accesible y con CORS habilitado para el dominio del frontend.

## Construcción y comprobaciones

```bash
npm run typecheck -w @vega/frontend
npm test -w @vega/frontend
npm run build -w @vega/frontend
```

El workflow **Frontend checks** también ejecuta estas comprobaciones para el PR. El resultado exitoso del CI no reemplaza una revisión visual en navegador, en móvil y escritorio.

## Despliegue: estado y requisitos

El frontend es una aplicación Vite estática; el servicio de procesamiento no queda desplegado por publicar solamente `frontend/`. La interfaz de análisis usa por defecto `http://127.0.0.1:8787`, que solo funciona en la máquina local. Para una demo remota se necesita:

1. Desplegar el servicio `@vega/processing` en un entorno accesible públicamente.
2. Configurar CORS para el dominio del frontend.
3. Definir `VITE_ANALYSIS_API_URL` con la URL HTTPS real del servicio antes del build.
4. Configurar el proyecto de hosting para el monorepo: instalación desde la raíz y build de `@vega/frontend`, publicando `frontend/dist`.
5. Desplegar primero como preview y probar importación, consulta de estado, resultados e imágenes.

No se incluye una URL de API ficticia ni se afirma que exista un despliegue. Si se publica únicamente la landing sin backend, debe presentarse como sitio institucional/preview visual; el análisis remoto no estará operativo.

## Límites funcionales y científicos

- La importación admite FeatureCollection con hasta cinco polígonos simples, según las validaciones del frontend y del servicio.
- La vista previa cartográfica no equivale a validar que el polígono corresponda al salar nombrado.
- El servicio puede no disponer de cobertura Sentinel-2 adecuada para todas las geometrías/fechas; los resultados pueden ser parciales o no tener datos.
- Los IDs y umbrales para áreas personalizadas son provisionales hasta su revisión por el equipo.
- No se publican automáticamente mediciones importadas en Avalanche. La revisión humana y científica sigue siendo necesaria.
- No se deben reutilizar mediciones de ejemplo u on-chain de otra geometría como si correspondieran al área importada.

## Pendientes para dar por cerrada la entrega

- [ ] Revisión visual en navegador en escritorio y móvil.
- [ ] Prueba local del flujo completo con el servicio de procesamiento activo.
- [ ] Validación de una geometría de origen conocido y revisión de resultados por el equipo científico.
- [ ] Definir y desplegar backend remoto antes de ofrecer análisis desde un enlace público.
- [ ] Revisar el orden de integración de PR #6, #7 y #8; no integrar sin aprobación de sus responsables.
