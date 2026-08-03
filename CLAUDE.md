# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Sistema interno de cotizaciones de Química Industrial Avanzada GUBA. SPA de React que genera PDFs de cotización y los persiste vía una API FastAPI contra PostgreSQL (Supabase). Producción: `https://cotizacionesguba.work`.

## Comandos

```bash
npm run dev            # Levanta backend (:8000) + frontend (:5173) vía dev_manager.py
npm run dev:frontend   # Solo Vite
npm run start-backend  # Solo FastAPI (python3 backend.py)
npm run build          # Build de producción a dist/
npm run lint           # ESLint
```

`dev_manager.py` mata lo que ocupe los puertos 8000/5173, arranca ambos procesos, multiplexa sus logs con prefijos `[BACKEND]`/`[FRONTEND]` y abre el navegador. Contiene rutas absolutas hardcodeadas de la máquina del autor (nvm, homebrew) — si falla la detección de binarios, es ahí.

No hay suite de tests.

Para la herramienta de preview del navegador existe `.claude/launch.json` con la configuración `vite-dev` en el puerto 5174.

## Advertencia crítica: dev apunta a producción

`src/utils/apiClient.js` hardcodea `API_URL = 'https://cotizacionesguba.work/api'`. **El frontend local escribe en la base de datos de producción.** El backend local que levanta `npm run dev` no recibe tráfico del frontend salvo que cambies esa constante a `http://localhost:8000`.

Antes de probar cualquier flujo que escriba (guardar cotización, cliente o producto), cambia `API_URL` a local — y no commitees ese cambio.

## Arquitectura

### Flujo de datos

`apiClient.js` (axios) es el único cliente HTTP real. Un interceptor de request inyecta `Authorization: Bearer <token>` desde `localStorage`; un interceptor de response borra el token y recarga la página ante un 401. Todos los endpoints excepto `/token` exigen JWT (`Depends(get_current_user)`).

`src/utils/api.js` es código muerto: cliente `fetch` sin autenticación, no importado por nadie. No lo uses; sus llamadas fallarían con 401.

### El folio es la llave de negocio

Las cotizaciones se identifican por `folio` (string generado en el cliente: `CLIENTE` + `DDMMAA`, ver `generarFolio()` en [QuoteForm.jsx:189](src/components/QuoteForm.jsx:189)), no por `id`. Todos los endpoints van por folio y `POST /cotizaciones` es un upsert (`ON CONFLICT (folio) DO UPDATE`) que borra y reinserta los `cotizacion_items`. Guardar con un folio existente lo sobrescribe silenciosamente.

### Esquema

PostgreSQL en Supabase, schema `cotizaciones` (`get_conn()` hace `SET search_path` en cada conexión). Tablas: `cotizaciones`, `cotizacion_items`, `clientes` (única por `nombre`), `catalogo_productos`, `usuarios`.

Las migraciones son idempotentes y viven en `ensure_schema()` en [backend.py:64](backend.py:64), ejecutada al importar el módulo: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Añade columnas nuevas ahí, no en archivos de migración aparte.

`migrate_db.py` y `cambiar_clave.py` son residuos de la etapa SQLite y apuntan a un `cotizaciones.db` que ya no existe. Están rotos; no los uses ni los tomes como referencia.

### Vigencia y renovaciones

Una cotización no guarda su estado de vigencia: se deriva en el cliente en [vencimiento.js](src/utils/vencimiento.js) a partir de `fecha + validez` (días), con umbral de "por vencer" de 3 días. Los estilos de badge por estado viven en `VIGENCIA_META`.

Al renovar una cotización vencida, `App.jsx` limpia el folio, pone fecha de hoy y guarda `renewFromFolio`; tras guardar la nueva, hace `PATCH /cotizaciones/{folio}/renovada` sobre la original. Una cotización vencida con `renovada_por` se muestra como `vencidaActualizada` y no ofrece el botón de renovar.

### Resultado de venta

La aceptación se registra **por partida**, no por cotización: `cotizacion_items.aceptado` es tri-estado (`NULL` sin decidir, `TRUE` aceptada, `FALSE` rechazada). El `estatus` de la cotización es un valor **derivado y denormalizado** — `derivar_estatus()` en [backend.py](backend.py) lo calcula (`Ganada` / `Ganada parcial` / `Perdida`) y lo guarda para que filtrar y reportar no requiera recorrer partidas. Nunca lo escribas directamente; pasa siempre por `PATCH /cotizaciones/{folio}/cierre`.

**Trampa al reguardar.** `POST /cotizaciones` borra y reinserta todas las partidas, lo que destruiría las marcas de aceptación al reeditar una cotización cerrada. El endpoint las rescata antes del `DELETE` y las restaura emparejando por `(clave, descripcion)` — los ids se regeneran, así que no sirven como llave. Si tocas esa función, conserva ese rescate.

**Dos categorías quedan fuera de la conversión**, y confundirlas con pérdidas falsearía la tasa:

- **Renovadas** (`renovada_por` no nulo): fueron reemplazadas, no rechazadas.
- **`Sin dato`**: histórico que venció antes de que existiera el seguimiento. `POST /cotizaciones/archivar` las marca en bloque por antigüedad. No son ventas perdidas — es la ausencia del dato; marcarlas como `Perdida` inventaría cientos de fracasos que nunca ocurrieron.

El helper `cuentaParaConversion` en [resultado.js](src/utils/resultado.js) centraliza esa exclusión y `estaResuelta` decide qué desaparece de los avisos; el frontend deriva las métricas con `calcularConversion` del mismo módulo.

La vigencia se recalcula en SQL en dos endpoints (`/cotizaciones/archivar` y `/reportes/oportunidades`) porque no está guardada: `SQL_VENCIMIENTO` en [backend.py](backend.py) reconstruye `fecha + validez` limpiando `validez` a dígitos, ya que es una columna TEXT.

**Un costo en cero significa que no se capturó**, no que el producto sea gratis. `calcularConversion` marca ese caso con `sinCosto` y devuelve `margenPct` nulo; calcularlo daría 100% de margen y haría creer que todo es ganancia.

**Los montos son cotizados, no facturados.** Al cliente se le cotiza el mínimo y suele comprar más, así que sumar totales subestima la venta real. Etiqueta siempre esas cifras como cotizadas y prefiere la tasa de conversión y el margen en porcentaje, que sí son representativos.

### PDF: dos representaciones a mantener sincronizadas

- [pdfGenerator.js](src/utils/pdfGenerator.js) — jsPDF nativo, dibuja el PDF real que descarga el usuario (carta, puntos, helvetica). Es la salida de verdad.
- [PDFTemplate.jsx](src/components/PDFTemplate.jsx) — vista previa en pantalla en HTML/Tailwind.

Cambiar columnas, textos o layout requiere tocar ambos o la vista previa deja de coincidir con el PDF. El logo se carga en runtime desde `/LOGO GUBA.png` en `public/` y se convierte a base64 vía canvas; si falla, el PDF cae a un encabezado de texto.

### Monedas e IVA

Cada partida tiene su propia `moneda` (`M.N.` o `USD`), así que una cotización puede mezclarlas. El subtotal suma todos los `importe` sin convertir y el IVA aplica 16% sobre ese total mezclado ([QuoteForm.jsx:177](src/components/QuoteForm.jsx:177)). El listado agrega las monedas distintas en el campo `monedas` para que la UI advierta el caso.

### Estado de clientes duplicado

Los clientes viven en la tabla `clientes` **y** en `localStorage` vía [clientsDB.js](src/utils/clientsDB.js), que autocompleta el formulario por nombre normalizado a mayúsculas. Los dos almacenes pueden divergir.

## Deploy

Push a `main` dispara [.github/workflows/deploy.yml](.github/workflows/deploy.yml) contra la VM de Oracle (`40.233.13.207`, usuario `ubuntu`, proyecto en `/home/ubuntu/cotizaciones`):

- **Frontend**: se construye en el runner de GitHub, se copia por scp y se hace `docker cp` dentro del contenedor nginx + `nginx -s reload`. El build nunca ocurre en la VM.
- **Backend**: deploy ligero por defecto — `docker cp backend.py` al contenedor + restart. Solo si cambió `requirements.txt` se hace `docker compose build backend`, que es pesado para la VM; evita tocar `requirements.txt` sin necesidad.

En la VM: backend `8010:8000`, frontend `8090:80` ([docker-compose.yml](docker-compose.yml)). Nginx sirve el SPA y hace proxy de `/api/` a `backend:8000` ([nginx.conf](nginx.conf)). El backend lee su configuración de `.env` en el host vía `env_file` — ese archivo no está en el repo y contiene las credenciales de Supabase y `JWT_SECRET_KEY`.

Los orígenes CORS permitidos están hardcodeados en [backend.py:27](backend.py:27); un dominio nuevo hay que agregarlo ahí.

## Archivos residuales

`src/App1.jsx` (versión anterior basada en html2canvas), `cotizaciones_deploy.zip`, `respaldo_cotizaciones_27_enero.zip`, `cotizacion_RSHUGHES071025.pdf` y `FORMATO COTIZACIONES chemico.csv` no forman parte del build. El `README.md` describe la etapa SQLite sin autenticación y está desactualizado.
