# Sistema de Cotizaciones GUBA

Sistema web interno para generar, guardar y dar seguimiento a cotizaciones de productos químicos. Frontend en React, backend en FastAPI y base de datos PostgreSQL alojada en Supabase.

Producción: [cotizacionesguba.work](https://cotizacionesguba.work)

## Características principales

- **Acceso protegido**: login con usuario y contraseña, sesión por JWT y bloqueo temporal tras 5 intentos fallidos.
- **Dashboard**: cotizaciones y monto del mes, totales históricos, distribución por estatus, top de clientes y alertas de cotizaciones por vencer.
- **Generación de cotizaciones**: formulario con múltiples partidas, autocompletado de clientes y productos desde el catálogo.
- **Vigencia y renovaciones**: cada cotización calcula su estado (vigente / por vencer / vencida) a partir de su fecha y sus días de validez; una cotización vencida se puede renovar y queda enlazada con la que la reemplaza.
- **Resultado de venta por partida**: al cerrar una cotización se marca qué productos aceptó el cliente. El resultado se deriva solo: Ganada si aceptó todo, Ganada parcial si aceptó algunas, Perdida si no aceptó ninguna. Las pérdidas se registran con motivo y nota.
- **Reportes de conversión**: tasa de conversión por cotización y por partida, margen sobre lo aceptado, motivos de pérdida y conversión por producto para detectar precios fuera de mercado.
- **Oportunidades de re-cotización**: clientes con cotizaciones vencidas sin cerrar, ordenados por cuántas veces se les ha cotizado, como agenda de seguimiento.
- **Archivado del histórico**: las cotizaciones que vencieron hace más de 90 días sin resultado se marcan como "Sin dato". Dejan de aparecer en los avisos y quedan fuera del cálculo de conversión, sin contarse como ventas perdidas.
- **Historial y gestión**: búsqueda en el historial, edición, duplicado, borrado y administración del catálogo de productos y la base de clientes.
- **PDF**: generación nativa con jsPDF, con logotipo, importe en letra y apertura del correo al cliente para adjuntarlo.
- **Multimoneda**: cada partida puede ser M.N. o USD, con IVA del 16%.
- **Modo oscuro** persistente.

## Tecnologías

### Frontend (`src/`)
- React 19 + Vite 7
- Tailwind CSS 4
- axios (cliente HTTP con interceptores de autenticación)
- jsPDF (generación de PDF)
- Lucide React (iconografía)

### Backend (raíz)
- FastAPI + Uvicorn
- PostgreSQL en Supabase (`psycopg2`, schema `cotizaciones`)
- Autenticación JWT (`python-jose`) con hash de contraseñas bcrypt (`passlib`)
- Pydantic para validación

### Infraestructura
- Docker Compose sobre una VM de Oracle Cloud
- Nginx sirviendo el SPA y haciendo proxy de `/api/`
- Despliegue automático con GitHub Actions al hacer push a `main`

## Estructura del proyecto

```
.
├── backend.py                 # API FastAPI: auth, clientes, catálogo y cotizaciones
├── dev_manager.py             # Arranca backend y frontend juntos en desarrollo
├── requirements.txt           # Dependencias de Python
├── Dockerfile.backend         # Imagen del backend
├── Dockerfile.frontend        # Build del SPA + Nginx
├── docker-compose.yml         # Servicios en la VM (backend 8010, frontend 8090)
├── nginx.conf                 # SPA + proxy /api/ → backend:8000
├── .github/workflows/deploy.yml
└── src/
    ├── App.jsx                # Orquestador: auth, navegación, historial, renovaciones
    ├── components/
    │   ├── Login.jsx          # Pantalla de acceso
    │   ├── Dashboard.jsx      # Métricas y alertas
    │   ├── QuoteForm.jsx      # Formulario de cotización
    │   ├── ManagementView.jsx # Historial, catálogo de productos y clientes
    │   └── PDFTemplate.jsx    # Vista previa en pantalla del PDF
    └── utils/
        ├── apiClient.js       # Cliente axios + servicio de autenticación
        ├── pdfGenerator.js    # Dibujo del PDF con jsPDF
        ├── vencimiento.js     # Cálculo de vigencia
        ├── clientsDB.js       # Caché local de clientes en localStorage
        └── numeroALetras.js   # Conversión de importes a texto
```

## Requisitos previos

- Node.js 18+ (el pipeline usa Node 20)
- Python 3.9+ (la imagen de producción usa 3.11)
- Un archivo `.env` en la raíz con las credenciales de la base de datos y la firma de los tokens:

```
JWT_SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
```

## Instalación

```bash
npm install
```

```bash
pip install -r requirements.txt
```

## Cómo ejecutar

```bash
npm run dev
```

Levanta el backend en el puerto `8000`, el frontend en el `5173` y abre el navegador. Otros scripts disponibles:

| Comando | Qué hace |
|---|---|
| `npm run dev:frontend` | Solo Vite |
| `npm run start-backend` | Solo la API |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | ESLint |

> **Importante:** el frontend apunta por defecto a la API de producción (`API_URL` en `src/utils/apiClient.js`). Para trabajar contra el backend local hay que cambiar esa constante a `http://localhost:8000` — y no commitear el cambio. De lo contrario, las pruebas locales escriben en la base de datos real.

## Uso

### Dashboard
Vista inicial con el resumen del mes, el histórico y las cotizaciones próximas a vencer.

### Nueva cotización
Al escribir el nombre de un cliente se autocompletan sus datos. El folio se genera a partir del nombre del cliente y la fecha, y puede editarse. Cada partida se puede tomar del catálogo o capturar a mano, con su propia moneda.

Desde la fila de un producto, el icono de disco lo guarda de forma permanente en el catálogo; lo mismo aplica para los clientes en la sección de datos del cliente.

### Historial y gestión
Pestañas de **Historial**, **Catálogo Productos** y **Base Clientes**. Desde el historial se puede buscar, previsualizar, descargar el PDF, editar, duplicar, renovar una cotización vencida o eliminarla.

### Registrar el resultado de una venta
En la columna **Resultado** del historial, un clic sobre la etiqueta abre la ventana de cierre: se palomean las partidas que aceptó el cliente (con un botón de "Aceptaron todo" para el caso común), se elige la fecha de cierre y, si quedó algo sin vender, el motivo y una nota.

El resultado no se captura a mano, se deriva de esas marcas. Una cotización cerrada se puede reabrir desde la misma ventana, lo que borra las marcas y la regresa a "En negociación".

Los montos que reporta el Dashboard son los **cotizados**, no los facturados: como al cliente se le suele cotizar el mínimo y termina comprando más, esas cifras subestiman la venta real. Por eso la métrica principal es la tasa de conversión y el margen se presenta en porcentaje.

## Base de datos

Esquema `cotizaciones` en PostgreSQL, con las tablas `cotizaciones`, `cotizacion_items`, `clientes`, `catalogo_productos` y `usuarios`. Las cotizaciones se identifican por su **folio**, no por su id: guardar con un folio existente actualiza la cotización correspondiente.

La aceptación de cada partida vive en `cotizacion_items.aceptado`, con tres estados: `NULL` (sin decidir), `TRUE` (aceptada) y `FALSE` (rechazada por el cliente). La columna `estatus` de la cotización guarda el resultado ya derivado de esas marcas.

Los cambios de esquema se aplican de forma idempotente en la función `ensure_schema()` de `backend.py`, que se ejecuta al iniciar la API.

## Despliegue

Cada push a `main` dispara el workflow de GitHub Actions:

1. El frontend se construye en el runner y se copia a la VM por SSH.
2. El build se inyecta en el contenedor de Nginx y se recarga el servidor.
3. El backend se actualiza copiando `backend.py` al contenedor y reiniciándolo. Solo se reconstruye la imagen si cambió `requirements.txt`.

Los builds de Docker no se hacen en la VM salvo ese caso, por sus recursos limitados.

## Licencia

Proyecto privado — Química Industrial Avanzada GUBA
