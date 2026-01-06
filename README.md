# Sistema de Cotizaciones GUBA

Sistema web de generación de cotizaciones profesionales en PDF para productos químicos, desarrollado con React (Frontend) y FastAPI con SQLite (Backend).

## Características principales

- **Generación de cotizaciones**: Interfaz intuitiva para crear cotizaciones con múltiples productos.
- **Persistencia en Base de Datos**: Los datos se guardan de forma permanente en una base de datos SQLite (`cotizaciones.db`).
- **Gestión de Clientes y Productos**: Catálogos dinámicos cargados directamente desde la base de datos.
- **Historial Completo**: Visualización y búsqueda de todas las cotizaciones anteriores.
- **Edición desde Historial**: Carga cotizaciones pasadas para editarlas o usarlas como base.
- **Generación de PDF**: Exportación optimizada con logotipo dinámico y formato profesional.
- **Cálculo automático**: Subtotales, IVA y totales según la moneda seleccionada (M.N./USD).

## Tecnologías utilizadas

### Frontend (src/)
- **React 19**
- **Vite**
- **Tailwind CSS**
- **jsPDF** (Generación local de PDFs)
- **Lucide React** (Iconografía)

### Backend (root)
- **FastAPI** (Servidor API Python)
- **SQLite** (Motor de base de datos)
- **Uvicorn** (Servidor ASGI)
- **Pydantic** (Validación de datos)

## Estructura del proyecto

```
.
├── backend.py              # Servidor API de Python (FastAPI + SQLite)
├── cotizaciones.db         # Archivo de base de datos SQL
├── package.json            # Scripts y dependencias de NPM
├── src/
│   ├── components/
│   │   ├── ManagementView.jsx # Gestión de Historial, Clientes y Catálogo
│   │   ├── QuoteForm.jsx      # Formulario de cotización inteligente
│   │   ├── Header.jsx         # Navegación
│   │   └── PDFTemplate.jsx    # Componente visual para el PDF
│   ├── utils/
│   │   ├── api.js             # Servicios de conexión con el backend
│   │   ├── pdfGenerator.js    # Lógica de dibujo del PDF nativo
│   │   └── numeroALetras.js   # Conversión de importes a texto
│   └── App.jsx                # Orquestador principal
```

## Requisitos previos

- Node.js (v18+)
- Python 3.9+
- Pip (instalador de paquetes de Python)

## Instalación y Configuración

1. **Dependencias del Frontend:**
   ```bash
   npm install
   ```

2. **Dependencias del Backend:**
   ```bash
   pip install fastapi uvicorn
   ```

## Cómo ejecutar

El sistema está configurado para iniciar ambos motores (Frontend y Backend) con un solo comando:

```bash
npm run dev
```

Esto abrirá automáticamente el navegador en `http://localhost:5173`. El backend correrá en el puerto `8000`.

## Uso

### Historial y Gestión
- Entra a la pestaña **Gestión** para ver el historial de cotizaciones, la base de clientes y el catálogo de productos.
- Pulsa el icono del **lápiz** en el historial para cargar una cotización anterior y editarla.

### Guardar Datos en Vivo
- Mientras haces una cotización, puedes pulsar el icono de **disco azul** en la fila de un producto para guardarlo permanentemente en el catálogo.
- Lo mismo aplica para los clientes en la sección de datos del cliente.

## Licencia

Proyecto privado - Química Industrial Avanzada GUBA