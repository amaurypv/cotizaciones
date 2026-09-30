import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Calendar, User, Save, Database, ArrowLeft, Wand2, CheckCircle2, Package, ClipboardList, Calculator, Eye, Hash, Clock, RefreshCw, Check, CircleDot, CircleDashed } from 'lucide-react';
import jsPDF from 'jspdf';
import PDFTemplate from './PDFTemplate';
import BuscadorLista from './BuscadorLista';
import { Tarjeta, Campo, Etiqueta, Boton, BotonIcono, Selector, SelectNativo, claseCampo, claseCampoCompacto, claseCampoInterno } from './ui';
import { numeroALetras } from '../utils/numeroALetras';
import { generateNativePDF } from '../utils/pdfGenerator';
import { getClientsDB, saveClientData, getClientData, getClientNames } from '../utils/clientsDB';
import apiClient from '../utils/apiClient';
import { getVigencia } from '../utils/vencimiento';

// Opciones predefinidas para las condiciones de la cotización
const OPCIONES_CONDICIONES = {
  validez: ['7', '15', '30', '60', '90'],
  tiempoEntrega: ['Inmediata', '1-2 días hábiles', '3-5 días hábiles', '1 semana', '2 semanas', '15 días', '30 días', 'A convenir'],
  condicionesPago: ['Contado', '15 días fecha factura', '30 dias fecha factura', '60 días fecha factura', '50% anticipo, 50% contra entrega', '100% anticipo', 'A convenir'],
  lugarEntrega: ['Planta del cliente', 'En nuestra planta (LAB)', 'Puesto en obra', 'A convenir'],
  garantia: ['No aplica', '30 días', '3 meses', '6 meses', '1 año', 'Según fabricante']
};

const OTRO_VALUE = '__otro__';

// Selector con opciones predefinidas + campo libre "Otro..."
const SelectConOtro = ({ label, value, options, onChange, suffix, placeholder = 'Especifica...' }) => {
  const valueEsPreset = options.includes(value);
  const [modoManual, setModoManual] = useState(!valueEsPreset && value !== '');

  const mostrarTexto = modoManual || (!valueEsPreset && value !== '');
  const selectValue = mostrarTexto ? OTRO_VALUE : (valueEsPreset ? value : '');

  const handleSelect = (v) => {
    if (v === OTRO_VALUE) {
      setModoManual(true);
      onChange('');
    } else {
      setModoManual(false);
      onChange(v);
    }
  };

  const opciones = [
    ...options.map((o) => ({ value: o, label: suffix ? `${o} ${suffix}` : o })),
    { value: OTRO_VALUE, label: 'Otro...' },
  ];

  return (
    <div>
      <Etiqueta>{label}</Etiqueta>
      <Selector value={selectValue} options={opciones} onChange={handleSelect} />
      {mostrarTexto && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${claseCampo} mt-2`}
        />
      )}
    </div>
  );
};

// Cómo se abrió el formulario; decide el título y la etiqueta del encabezado
const MODOS = {
  nueva: { label: 'Borrador', badge: 'bg-marca-50 text-marca-900 ring-marca-100' },
  editando: { label: 'Editando', badge: 'bg-amber-50 text-amber-800 ring-amber-200' },
  renovacion: { label: 'Renovación', badge: 'bg-teal-50 text-teal-800 ring-teal-200' },
  copia: { label: 'Copia', badge: 'bg-gray-100 text-gray-700 ring-gray-200' },
};

const formatoFecha = (fecha) =>
  fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

const Dato = ({ icono, children, apagado = false }) => {
  const Icono = icono;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs ${apagado ? 'text-gray-400' : 'text-gray-700'}`}>
      <Icono className="h-3.5 w-3.5 text-gray-400" />
      {children}
    </span>
  );
};

const QuoteForm = ({ onSave, initialQuote, initialShowPreview = false, onExitPreview, renewFromFolio = null }) => {
  // Se fija al montar: App remonta el formulario (key) cada vez que lo abre, y
  // renewFromFolio se limpia en App justo después de guardar la renovación.
  const [modo] = useState(() => {
    if (renewFromFolio) return 'renovacion';
    if (initialQuote?.folio) return 'editando';
    if (initialQuote) return 'copia';
    return 'nueva';
  });
  const [folioRenovado] = useState(renewFromFolio);
  // Foto (JSON) de la cotización tal como está en la base de datos; null si
  // aún no existe ahí. Compararla con el estado actual dice si hay cambios.
  const [guardadoBase, setGuardadoBase] = useState(null);
  const [guardadaEn, setGuardadaEn] = useState(null);

  const printRef = useRef();

  const [quote, setQuote] = useState({
    folio: '',
    fecha: new Date().toISOString().split('T')[0],
    cliente: {
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      planta: '',
      rfc: ''
    },
    productos: [
      {
        id: 1,
        cantidad: '',
        unidad: 'KILOGRAMO',
        descripcion: '',
        presentacion: '',
        clave: '',
        moneda: 'M.N.',
        precio: '',
        importe: 0,
        proveedor: '',
        costo: ''
      }
    ],
    condiciones: {
      validez: '30',
      tiempoEntrega: 'Inmediata',
      condicionesPago: '30 dias fecha factura',
      lugarEntrega: '',
      garantia: ''
    },
    terminos: ''
  });

  const [showPreview, setShowPreview] = useState(false);
  const [savedClients, setSavedClients] = useState([]);
  const [showClientSaved, setShowClientSaved] = useState(false);

  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [clientesBase, setClientesBase] = useState([]);
  const [loadingDB, setLoadingDB] = useState(false);

  useEffect(() => {
    const fetchDB = async () => {
      setLoadingDB(true);
      try {
        const resClientes = await apiClient.get('/clientes');
        setClientesBase(resClientes.data);

        const resProd = await apiClient.get('/productos_catalogo');
        setProductosCatalogo(resProd.data);
      } catch (error) {
        console.error('Error fetching DB for form:', error);
      } finally {
        setLoadingDB(false);
      }
    };
    fetchDB();
  }, []);

  // Efecto para cargar cotización inicial para editar
  useEffect(() => {
    if (initialQuote) {
      const cargada = {
        folio: initialQuote.folio,
        fecha: initialQuote.fecha,
        cliente: {
          nombre: initialQuote.cliente.nombre || "",
          contacto: initialQuote.cliente.contacto || "",
          telefono: initialQuote.cliente.telefono || "",
          email: initialQuote.cliente.email || "",
          direccion: initialQuote.cliente.direccion || "",
          planta: initialQuote.cliente.planta || "",
          rfc: initialQuote.cliente.rfc || ""
        },
        productos: initialQuote.productos.map(p => ({
          ...p,
          id: p.id || Math.random() // Asegurar ID para React
        })),
        condiciones: {
          validez: '30',
          tiempoEntrega: 'Inmediata',
          condicionesPago: '30 dias fecha factura',
          lugarEntrega: '',
          garantia: '',
          ...(initialQuote.condiciones || {})
        },
        terminos: initialQuote.terminos || ""
      };
      setQuote(cargada);
      // Solo una cotización con folio ya existe en la base; copias y
      // renovaciones son nuevas hasta que se guardan.
      if (initialQuote.folio) setGuardadoBase(JSON.stringify(cargada));
    }
  }, [initialQuote]);

  const hayCambios = guardadoBase !== null && JSON.stringify(quote) !== guardadoBase;
  const sinGuardar = guardadoBase === null && Boolean(quote.cliente.nombre);

  // Avisa antes de cerrar o recargar la pestaña con trabajo sin guardar
  useEffect(() => {
    if (!hayCambios && !sinGuardar) return;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios, sinGuardar]);

  useEffect(() => {
    if (initialShowPreview) setShowPreview(true);
  }, [initialShowPreview]);

  const unidades = ['KILOGRAMO', 'LITRO', 'MILILITRO', 'PIEZA', 'GALON USA', 'TONELADA', 'METRO CUBICO'];

  const calcularImporte = (cantidad, precio) => {
    const cant = parseFloat(cantidad) || 0;
    const prec = parseFloat(precio) || 0;
    return cant * prec;
  };

  const calcularSubtotal = () => {
    return quote.productos.reduce((sum, producto) => sum + producto.importe, 0);
  };

  const calcularIVA = () => {
    return calcularSubtotal() * 0.16;
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularIVA();
  };

  const generarFolio = () => {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().substr(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');

    // Obtener nombre del cliente, usar las primeras palabras o un default
    let nombreCliente = quote.cliente.nombre || 'CLIENTE';

    // Limpiar y formatear el nombre del cliente
    nombreCliente = nombreCliente
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remover caracteres especiales
      .split(' ')
      .slice(0, 2) // Tomar máximo 2 palabras
      .join('')
      .substring(0, 12); // Limitar a 12 caracteres

    // Si el nombre está vacío, usar default
    if (!nombreCliente) {
      nombreCliente = 'CLIENTE';
    }

    return `${nombreCliente}${dia}${mes}${año}`;
  };

  // Cargar clientes guardados al inicializar
  useEffect(() => {
    const clientNames = getClientNames();
    setSavedClients(clientNames);
  }, []);

  // Cargar datos del cliente cuando se selecciona uno
  const cargarDatosCliente = (nombreCliente) => {
    const clientData = getClientData(nombreCliente);

    setQuote(prev => ({
      ...prev,
      cliente: {
        ...prev.cliente,
        nombre: nombreCliente,
        ...clientData // Esto cargará contacto, planta, rfc, etc. si están guardados
      }
    }));
  };

  // Guardar datos del cliente actual en el backend
  const guardarDatosCliente = async () => {
    if (!quote.cliente.nombre) {
      alert('Debe especificar un nombre de cliente para guardar');
      return;
    }

    const clientData = {
      nombre: quote.cliente.nombre,
      contacto: quote.cliente.contacto || "",
      telefono: quote.cliente.telefono || "",
      email: quote.cliente.email || "",
      direccion: quote.cliente.direccion || "",
      planta: quote.cliente.planta || "",
      rfc: quote.cliente.rfc || ""
    };

    try {
      await apiClient.post('/clientes', clientData);
      // Refrescar lista de clientes
      const resClientes = await apiClient.get('/clientes');
      setClientesBase(resClientes.data);

      setShowClientSaved(true);
      setTimeout(() => setShowClientSaved(false), 2000);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error de conexión al guardar cliente');
    }
  };

  const actualizarProducto = (index, campo, valor) => {
    const nuevosProductos = [...quote.productos];
    nuevosProductos[index][campo] = valor;

    if (campo === 'cantidad' || campo === 'precio') {
      nuevosProductos[index].importe = calcularImporte(
        nuevosProductos[index].cantidad,
        nuevosProductos[index].precio
      );
    }

    setQuote({ ...quote, productos: nuevosProductos });
  };

  const agregarProducto = () => {
    const nuevoProducto = {
      id: quote.productos.length + 1,
      cantidad: '',
      unidad: 'KILOGRAMO',
      descripcion: '',
      presentacion: '',
      clave: '',
      moneda: 'M.N.',
      precio: '',
      importe: 0,
      proveedor: '',
      costo: ''
    };
    setQuote({
      ...quote,
      productos: [...quote.productos, nuevoProducto]
    });
  };

  const seleccionarProducto = (index, productoSeleccionado) => {
    const nuevosProductos = [...quote.productos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      clave: productoSeleccionado.clave,
      descripcion: productoSeleccionado.descripcion,
      unidad: productoSeleccionado.unidad || nuevosProductos[index].unidad,
      precio: productoSeleccionado.precio,
      moneda: productoSeleccionado.moneda || nuevosProductos[index].moneda,
      proveedor: productoSeleccionado.proveedor || nuevosProductos[index].proveedor || '',
      costo: productoSeleccionado.costo || nuevosProductos[index].costo || 0,
      importe: calcularImporte(nuevosProductos[index].cantidad || 0, productoSeleccionado.precio)
    };
    setQuote({ ...quote, productos: nuevosProductos });
  };

  const eliminarProducto = (index) => {
    if (quote.productos.length > 1) {
      const nuevosProductos = quote.productos.filter((_, i) => i !== index);
      setQuote({ ...quote, productos: nuevosProductos });
    }
  };

  const guardarProductoEnBase = async (producto) => {
    if (!producto.clave || !producto.descripcion) {
      alert('El producto debe tener clave y descripción para guardarse en el catálogo');
      return;
    }

    const itemCatalogo = {
      clave: producto.clave,
      descripcion: producto.descripcion,
      precio: parseFloat(producto.precio) || 0,
      unidad: producto.unidad,
      moneda: producto.moneda,
      proveedor: producto.proveedor || "",
      costo: parseFloat(producto.costo) || 0
    };

    try {
      await apiClient.post('/productos_catalogo', itemCatalogo);
      // Refrescar catálogo local
      const resProd = await apiClient.get('/productos_catalogo');
      setProductosCatalogo(resProd.data);
      alert(`Producto "${producto.clave}" guardado exitosamente en el catálogo`);
    } catch (error) {
      console.error('Error saving catalog product:', error);
      alert('Error de conexión al guardar producto');
    }
  };

  const seleccionarCliente = (nombreCliente) => {
    const datosCliente = clientesBase.find(c => c.nombre === nombreCliente);
    if (datosCliente) {
      setQuote(prev => ({
        ...prev,
        cliente: {
          ...prev.cliente,
          nombre: nombreCliente,
          contacto: datosCliente.contacto || "",
          telefono: datosCliente.telefono || "",
          email: datosCliente.email || "",
          direccion: datosCliente.direccion || "",
          planta: datosCliente.planta || "",
          rfc: datosCliente.rfc || ""
        }
      }));
    }
  };

  const descargarPDF = async () => {
    try {
      const totals = {
        subtotal: calcularSubtotal(),
        iva: calcularIVA(),
        total: calcularTotal()
      };

      // Generar PDF nativo (mucho más liviano)
      const doc = await generateNativePDF(quote, totals, numeroALetras);

      const folio = quote.folio || generarFolio();
      doc.save(`cotizacion_${folio}.pdf`);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handleSave = async () => {
    if (!quote.cliente.nombre) {
      alert('Debe especificar un nombre de cliente para guardar la cotización');
      return;
    }

    const folio = quote.folio || generarFolio();

    const cotizacionParaBackend = {
      folio: folio,
      fecha: quote.fecha,
      cliente: {
        nombre: quote.cliente.nombre,
        contacto: quote.cliente.contacto || "",
        telefono: quote.cliente.telefono || "",
        email: quote.cliente.email || "",
        direccion: quote.cliente.direccion || "",
        planta: quote.cliente.planta || "",
        rfc: quote.cliente.rfc || ""
      },
      productos: quote.productos.filter(p => p.descripcion).map(p => ({
        clave: p.clave || "SIN_CLAVE",
        descripcion: p.descripcion,
        cantidad: parseFloat(p.cantidad) || 0,
        unidad: p.unidad,
        precio: parseFloat(p.precio) || 0,
        importe: parseFloat(p.importe) || 0,
        moneda: p.moneda,
        presentacion: p.presentacion || "",
        proveedor: p.proveedor || "",
        costo: parseFloat(p.costo) || 0
      })),
      condiciones: {
        validez: quote.condiciones.validez,
        tiempoEntrega: quote.condiciones.tiempoEntrega,
        condicionesPago: quote.condiciones.condicionesPago,
        lugarEntrega: quote.condiciones.lugarEntrega || '',
        garantia: quote.condiciones.garantia || ''
      },
      terminos: quote.terminos || "",
      total: calcularTotal()
    };

    try {
      await apiClient.post('/cotizaciones', cotizacionParaBackend);

      // Actualizar el estado local para el historial (formato simplificado para la tabla)
      const nuevaCotizacionLocal = {
        id: Date.now(),
        folio: folio,
        fecha: quote.fecha,
        validez: quote.condiciones.validez,
        cliente: quote.cliente.nombre,
        productos: quote.productos.map(p => p.descripcion).filter(d => d).join(', '),
        total: calcularTotal(),
        estatus: 'Enviada',
        renovadaPor: null,
        fechaCreacion: new Date().toISOString()
      };

      onSave(nuevaCotizacionLocal);
      setQuote(prev => ({ ...prev, folio: folio }));
      setGuardadoBase(JSON.stringify({ ...quote, folio }));
      setGuardadaEn(new Date());
      alert('Cotización guardada exitosamente en la base de datos');
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Error al guardar la cotización en el servidor');
    }
  };


  if (showPreview) {
    const totals = {
      subtotal: calcularSubtotal(),
      iva: calcularIVA(),
      total: calcularTotal()
    };

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Boton
            variante="secundario"
            icono={ArrowLeft}
            onClick={() => initialShowPreview && onExitPreview ? onExitPreview() : setShowPreview(false)}
          >
            {initialShowPreview && onExitPreview ? 'Volver al Historial' : 'Regresar al Formulario'}
          </Boton>
          <Boton icono={Download} onClick={descargarPDF}>
            Descargar PDF
          </Boton>
        </div>

        <PDFTemplate
          ref={printRef}
          quote={quote}
          totals={totals}
          numeroALetras={numeroALetras}
        />
      </div>
    );
  }

  const actualizarCliente = (campo, valor) => setQuote({
    ...quote,
    cliente: { ...quote.cliente, [campo]: valor }
  });

  const actualizarCondicion = (campo, valor) => setQuote({
    ...quote,
    condiciones: { ...quote.condiciones, [campo]: valor }
  });

  const th = 'px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';

  // Una nueva o una copia, una vez guardada, se sigue editando sobre su folio
  const modoActual = guardadoBase !== null && (modo === 'nueva' || modo === 'copia') ? 'editando' : modo;
  const titulo = modoActual === 'nueva' ? 'Nueva cotización' : (quote.cliente.nombre || 'Cotización sin cliente');
  const { fechaVencimiento } = getVigencia(quote.fecha, quote.condiciones.validez);

  let estadoGuardado;
  if (hayCambios) {
    estadoGuardado = { icono: CircleDot, texto: 'Cambios sin guardar', clase: 'text-amber-700' };
  } else if (guardadaEn) {
    estadoGuardado = {
      icono: Check,
      texto: `Guardada ${guardadaEn.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      clase: 'text-green-700',
    };
  } else if (guardadoBase !== null) {
    estadoGuardado = { icono: Check, texto: 'Sin cambios', clase: 'text-gray-500' };
  } else {
    estadoGuardado = { icono: CircleDashed, texto: 'Sin guardar', clase: 'text-gray-500' };
  }
  const IconoEstado = estadoGuardado.icono;

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-2xl font-bold leading-tight text-gray-900">{titulo}</h2>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MODOS[modoActual].badge}`}>
              {MODOS[modoActual].label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {quote.folio
              ? <Dato icono={Hash}>{quote.folio}</Dato>
              : <Dato icono={Hash} apagado>Sin folio</Dato>}
            {modo === 'renovacion' && folioRenovado && (
              <Dato icono={RefreshCw}>Reemplaza {folioRenovado}</Dato>
            )}
            {fechaVencimiento && (
              <>
                <Dato icono={Calendar}>{formatoFecha(new Date(quote.fecha + 'T00:00:00'))}</Dato>
                <Dato icono={Clock}>Vence {formatoFecha(fechaVencimiento)}</Dato>
              </>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 pt-1.5 text-sm font-medium ${estadoGuardado.clase}`}>
          <IconoEstado className="h-4 w-4" />
          {estadoGuardado.texto}
        </div>
      </div>

      {/* Información básica */}
      <Tarjeta titulo="Datos generales" icono={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Campo
            label="Fecha"
            type="date"
            value={quote.fecha}
            onChange={(e) => setQuote({ ...quote, fecha: e.target.value })}
          />
          <div>
            <Etiqueta>Folio</Etiqueta>
            <div className="flex">
              <input
                type="text"
                value={quote.folio}
                onChange={(e) => setQuote({ ...quote, folio: e.target.value })}
                placeholder="Ej: AXAYINDUSTRIAL23092025"
                className={`${claseCampo} rounded-r-none`}
              />
              <Boton
                variante="secundario"
                className="rounded-l-none border-l-0"
                icono={Wand2}
                onClick={() => setQuote({ ...quote, folio: generarFolio() })}
                title="Generar folio a partir del cliente y la fecha de hoy"
              >
                Auto
              </Boton>
            </div>
          </div>
          <SelectConOtro
            label="Validez (días)"
            value={quote.condiciones.validez}
            options={OPCIONES_CONDICIONES.validez}
            suffix="días"
            placeholder="Ej: 45"
            onChange={(v) => actualizarCondicion('validez', v)}
          />
        </div>
      </Tarjeta>

      {/* Información del cliente */}
      <Tarjeta
        titulo="Información del Cliente"
        icono={User}
        accion={
          <div className="flex items-center gap-3">
            {showClientSaved && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                Cliente guardado
              </span>
            )}
            <Boton variante="secundario" tamano="sm" icono={Database} onClick={guardarDatosCliente} title="Guardar datos del cliente">
              Guardar cliente
            </Boton>
          </div>
        }
      >
        <div className="mb-5">
          <Etiqueta>Buscar cliente guardado</Etiqueta>
          <BuscadorLista
            items={clientesBase}
            textoBusqueda={(cte) => `${cte.nombre} ${cte.rfc || ''}`}
            renderItem={(cte) => (
              <>
                {cte.nombre}
                {cte.rfc && <span className="text-gray-500"> ({cte.rfc})</span>}
              </>
            )}
            onSelect={(cte) => seleccionarCliente(cte.nombre)}
            placeholder="Escribe el nombre o RFC del cliente..."
            anchoMinimo={0}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Campo
            label="Cliente/Empresa"
            value={quote.cliente.nombre}
            onChange={(e) => actualizarCliente('nombre', e.target.value)}
            placeholder="Nombre del cliente"
          />
          <Campo
            label="Contacto"
            value={quote.cliente.contacto}
            onChange={(e) => actualizarCliente('contacto', e.target.value)}
            placeholder="Persona de contacto"
          />
          <Campo
            label="Planta/Ubicación"
            value={quote.cliente.planta}
            onChange={(e) => actualizarCliente('planta', e.target.value)}
            placeholder="Ej: ZODIAC"
          />
          <Campo
            label="Teléfono"
            type="tel"
            value={quote.cliente.telefono}
            onChange={(e) => actualizarCliente('telefono', e.target.value)}
          />
          <Campo
            label="RFC"
            value={quote.cliente.rfc}
            onChange={(e) => actualizarCliente('rfc', e.target.value)}
            placeholder="RFC del cliente"
          />
          <Campo
            label="Correo electrónico"
            type="email"
            value={quote.cliente.email}
            onChange={(e) => actualizarCliente('email', e.target.value)}
            placeholder="correo@empresa.com"
          />
        </div>
      </Tarjeta>

      {/* Productos */}
      <Tarjeta
        titulo="Productos"
        icono={Package}
        sinPadding
        accion={
          <Boton variante="exito" tamano="sm" icono={Plus} onClick={agregarProducto}>
            Agregar producto
          </Boton>
        }
      >
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1380px] table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`${th} w-[6.5rem] pl-6`}>Clave</th>
                <th className={`${th} w-[6rem]`}>Cantidad</th>
                <th className={`${th} w-[9.5rem]`}>Unidad</th>
                <th className={th}>Descripción</th>
                <th className={`${th} w-[7rem]`}>Presentación</th>
                <th className={`${th} w-[7rem]`} title="Uso interno: no aparece en el PDF">Proveedor <span className="normal-case font-normal text-gray-400">(int)</span></th>
                <th className={`${th} w-[6rem]`} title="Uso interno: no aparece en el PDF">Costo <span className="normal-case font-normal text-gray-400">(int)</span></th>
                <th className={`${th} w-[6.5rem]`}>Moneda</th>
                <th className={`${th} w-[6.5rem]`}>Precio</th>
                <th className={`${th} w-[7rem] text-right`}>Importe</th>
                <th className={`${th} w-[5.5rem] pr-6`}><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quote.productos.map((producto, index) => (
                <tr key={producto.id} className="align-top hover:bg-gray-50/60">
                  <td className="px-3 py-3 pl-6">
                    <input
                      type="text"
                      value={producto.clave}
                      onChange={(e) => actualizarProducto(index, 'clave', e.target.value)}
                      className={claseCampoCompacto}
                      placeholder="Q001"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={producto.cantidad}
                      onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                      className={claseCampoCompacto}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <SelectNativo
                      compacto
                      value={producto.unidad}
                      onChange={(e) => actualizarProducto(index, 'unidad', e.target.value)}
                    >
                      {unidades.map(unidad => (
                        <option key={unidad} value={unidad}>{unidad}</option>
                      ))}
                    </SelectNativo>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={producto.descripcion}
                        onChange={(e) => actualizarProducto(index, 'descripcion', e.target.value)}
                        className={claseCampoCompacto}
                        placeholder="Descripción del producto"
                      />
                      <BuscadorLista
                        compacto
                        items={productosCatalogo}
                        textoBusqueda={(prod) => `${prod.clave} ${prod.descripcion}`}
                        renderItem={(prod) => (
                          <>
                            <span className="font-medium">{prod.clave}</span> - {prod.descripcion}
                            <span className="text-gray-500"> - ${prod.precio} ({prod.moneda})</span>
                          </>
                        )}
                        onSelect={(prod) => seleccionarProducto(index, prod)}
                        placeholder="Buscar en catálogo..."
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={producto.presentacion}
                      onChange={(e) => actualizarProducto(index, 'presentacion', e.target.value)}
                      className={claseCampoCompacto}
                      placeholder="E - 4 Lt"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={producto.proveedor}
                      onChange={(e) => actualizarProducto(index, 'proveedor', e.target.value)}
                      className={claseCampoInterno}
                      placeholder="Info interna"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={producto.costo}
                      onChange={(e) => actualizarProducto(index, 'costo', e.target.value)}
                      className={claseCampoInterno}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <SelectNativo
                      compacto
                      value={producto.moneda}
                      onChange={(e) => actualizarProducto(index, 'moneda', e.target.value)}
                    >
                      <option value="M.N.">M.N.</option>
                      <option value="USD">USD</option>
                    </SelectNativo>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={producto.precio}
                      onChange={(e) => actualizarProducto(index, 'precio', e.target.value)}
                      className={claseCampoCompacto}
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-block pt-2 text-sm font-semibold text-gray-900 tabular-nums">
                      ${producto.importe.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-3 pr-6">
                    <div className="flex items-center gap-1">
                      <BotonIcono
                        icono={Save}
                        onClick={() => guardarProductoEnBase(producto)}
                        title="Guardar en catálogo"
                      />
                      <BotonIcono
                        icono={Trash2}
                        peligro
                        onClick={() => eliminarProducto(index)}
                        disabled={quote.productos.length === 1}
                        title="Eliminar fila"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Condiciones */}
        <Tarjeta titulo="Condiciones" icono={ClipboardList} className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectConOtro
              label="Tiempo de Entrega"
              value={quote.condiciones.tiempoEntrega}
              options={OPCIONES_CONDICIONES.tiempoEntrega}
              onChange={(v) => actualizarCondicion('tiempoEntrega', v)}
            />
            <SelectConOtro
              label="Condiciones de Pago"
              value={quote.condiciones.condicionesPago}
              options={OPCIONES_CONDICIONES.condicionesPago}
              onChange={(v) => actualizarCondicion('condicionesPago', v)}
            />
            <SelectConOtro
              label="Lugar de Entrega"
              value={quote.condiciones.lugarEntrega}
              options={OPCIONES_CONDICIONES.lugarEntrega}
              onChange={(v) => actualizarCondicion('lugarEntrega', v)}
            />
            <SelectConOtro
              label="Garantía"
              value={quote.condiciones.garantia}
              options={OPCIONES_CONDICIONES.garantia}
              onChange={(v) => actualizarCondicion('garantia', v)}
            />
            <div className="md:col-span-2">
              <Etiqueta>Términos y Observaciones</Etiqueta>
              <textarea
                value={quote.terminos}
                onChange={(e) => setQuote({ ...quote, terminos: e.target.value })}
                className={`${claseCampo} h-auto py-2.5`}
                rows={4}
                placeholder="Ej: TAMBORES DE PLASTICO DE 222 KG, PRECIOS CON TAMBOR INCLUIDO..."
              />
            </div>
          </div>
        </Tarjeta>

        {/* Resumen: totales y acciones de la cotización */}
        <Tarjeta titulo="Resumen" icono={Calculator} className="lg:sticky lg:top-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Subtotal</dt>
              <dd className="tabular-nums text-gray-900">${calcularSubtotal().toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>IVA (16%)</dt>
              <dd className="tabular-nums text-gray-900">${calcularIVA().toFixed(2)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
              <dt className="font-semibold text-gray-900">Total</dt>
              <dd className="text-2xl font-bold tabular-nums text-marca-900">${calcularTotal().toFixed(2)}</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-2 border-t border-gray-100 pt-5">
            <Boton variante="exito" icono={Save} onClick={handleSave} className="w-full">
              Guardar Historial
            </Boton>
            <div className="grid grid-cols-2 gap-2">
              <Boton icono={Eye} onClick={() => setShowPreview(true)}>
                Vista previa
              </Boton>
              <Boton icono={Download} onClick={descargarPDF} title="Descargar PDF">
                PDF
              </Boton>
            </div>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
};

export default QuoteForm;
