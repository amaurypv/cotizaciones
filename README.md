# Sistema de Cotizaciones

Sistema web de generación de cotizaciones profesionales en PDF para productos químicos, desarrollado con React y Vite.

## Características principales

- **Generación de cotizaciones**: Interfaz intuitiva para crear cotizaciones con múltiples productos
- **Gestión de clientes**: Base de datos local de clientes con autocompletado
- **Productos predefinidos**: Catálogo de productos químicos con claves y precios
- **Generación de PDF**: Exportación a PDF optimizado y ligero
- **Cálculo automático**: Subtotales, IVA y totales calculados automáticamente
- **Folios automáticos**: Generación de folios únicos basados en fecha y cliente
- **Vista previa**: Visualización antes de generar el PDF final

## Tecnologías utilizadas

- **React 19** - Framework de UI
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **jsPDF** - Generación de PDFs
- **lucide-react** - Librería de iconos

## Estructura del proyecto

```
src/
├── components/
│   ├── Header.jsx          # Encabezado de la aplicación
│   ├── QuoteForm.jsx       # Formulario principal de cotizaciones
│   └── PDFTemplate.jsx     # Template para generación de PDF
├── utils/
│   ├── clientsDB.js        # Gestión de base de datos de clientes
│   ├── numeroALetras.js    # Conversión de números a letras
│   └── pdfGenerator.js     # Lógica de generación de PDF
└── App.jsx                 # Componente principal
```

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd cotizaciones
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

4. Abrir en el navegador: `http://localhost:5173`

## Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Preview de la build de producción
- `npm run lint` - Ejecuta el linter

## Uso

### Crear una nueva cotización

1. Completar los datos básicos (fecha, folio)
2. Ingresar información del cliente o seleccionar uno guardado
3. Agregar productos con cantidades y precios
4. Configurar condiciones de entrega y pago
5. Hacer clic en "Vista Previa" para revisar
6. Descargar el PDF final

### Gestionar clientes

- **Guardar cliente**: Completar los datos del cliente y hacer clic en el botón "Guardar"
- **Cargar cliente**: Seleccionar del dropdown "Clientes Guardados"
- Los datos se almacenan localmente en el navegador (localStorage)

### Productos predefinidos

El sistema incluye un catálogo de productos químicos comunes:
- Alcohol Isopropílico
- Hipoclorito de Sodio
- Acetona Industrial
- Thinner Estándar
- Sosa Cáustica Líquida
- Y más...

## Configuración

### Agregar nuevos productos

Editar el array `productosComunes` en `src/components/QuoteForm.jsx`:

```javascript
const productosComunes = [
  { clave: 'Q001', descripcion: 'PRODUCTO', precio: 100.00 },
  // ...
];
```

### Agregar clientes predefinidos

Editar el array `clientes` en `src/components/QuoteForm.jsx`:

```javascript
const clientes = [
  'NOMBRE DE EMPRESA 1',
  'NOMBRE DE EMPRESA 2',
  // ...
];
```

## Build para producción

```bash
npm run build
```

Los archivos optimizados se generarán en el directorio `dist/`.

## Licencia

Proyecto privado

## Soporte

Para reportar problemas o sugerencias, crear un issue en el repositorio.