import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Calendar, User, FileText, Save, Database } from 'lucide-react';
import jsPDF from 'jspdf';
import PDFTemplate from './PDFTemplate';
import { numeroALetras } from '../utils/numeroALetras';
import { generateNativePDF } from '../utils/pdfGenerator';
import { getClientsDB, saveClientData, getClientData, getClientNames } from '../utils/clientsDB';

const QuoteForm = ({ onSave, initialQuote }) => {
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
        importe: 0
      }
    ],
    condiciones: {
      validez: '30',
      tiempoEntrega: 'Inmediata',
      condicionesPago: '30 dias fecha factura'
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
        const resClientes = await fetch('http://localhost:8000/clientes');
        if (resClientes.ok) setClientesBase(await resClientes.json());

        const resProd = await fetch('http://localhost:8000/productos_catalogo');
        if (resProd.ok) setProductosCatalogo(await resProd.json());
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
      setQuote({
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
        condiciones: initialQuote.condiciones || {
          validez: '30',
          tiempoEntrega: 'Inmediata',
          condicionesPago: '30 dias fecha factura'
        },
        terminos: initialQuote.terminos || ""
      });
    }
  }, [initialQuote]);

  const unidades = ['KILOGRAMO', 'LITRO', 'PIEZA', 'GALON USA', 'TONELADA', 'METRO CUBICO'];

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
      const response = await fetch('http://localhost:8000/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (response.ok) {
        // Refrescar lista de clientes
        const resClientes = await fetch('http://localhost:8000/clientes');
        if (resClientes.ok) setClientesBase(await resClientes.json());

        setShowClientSaved(true);
        setTimeout(() => setShowClientSaved(false), 2000);
      } else {
        alert('Error al guardar cliente en el servidor');
      }
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
      importe: 0
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

    // Preparar el objeto para el backend según el modelo Pydantic
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
        condicionesPago: quote.condiciones.condicionesPago
      },
      terminos: quote.terminos || "",
      total: calcularTotal()
    };

    try {
      const response = await fetch('http://localhost:8000/cotizaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionParaBackend),
      });

      if (response.ok) {
        const result = await response.json();

        // Actualizar el estado local para el historial (formato simplificado para la tabla)
        const nuevaCotizacionLocal = {
          id: Date.now(), // El backend generará su propio ID, esto es para la UI inmediata
          folio: folio,
          fecha: quote.fecha,
          cliente: quote.cliente.nombre,
          productos: quote.productos.map(p => p.descripcion).filter(d => d).join(', '),
          total: calcularTotal(),
          fechaCreacion: new Date().toISOString()
        };

        onSave(nuevaCotizacionLocal);
        setQuote(prev => ({ ...prev, folio: folio }));
        alert('Cotización guardada exitosamente en la base de datos');
      } else {
        const errorData = await response.json();
        console.error('Error al guardar en backend:', errorData);
        alert('Error al guardar en el servidor: ' + (errorData.detail || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('No se pudo conectar con el servidor. ¿Está ejecutándose el backend?');
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
          <button
            onClick={() => setShowPreview(false)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            ← Regresar al Formulario
          </button>
          <button
            onClick={descargarPDF}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
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

  return (
    <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-10 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <span>Nueva Cotización</span>
        </h2>
      </div>

      <div className="p-10 space-y-12">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={quote.fecha}
              onChange={(e) => setQuote({ ...quote, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folio
            </label>
            <div className="flex">
              <input
                type="text"
                value={quote.folio}
                onChange={(e) => setQuote({ ...quote, folio: e.target.value })}
                placeholder="Ej: AXAYINDUSTRIAL23092025"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => setQuote({ ...quote, folio: generarFolio() })}
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                Auto
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validez (días)
            </label>
            <input
              type="number"
              value={quote.condiciones.validez}
              onChange={(e) => setQuote({
                ...quote,
                condiciones: { ...quote.condiciones, validez: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Información del cliente */}
        <div className="border-t pt-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Información del Cliente</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente/Empresa
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={quote.cliente.nombre}
                  onChange={(e) => setQuote({
                    ...quote,
                    cliente: { ...quote.cliente, nombre: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre del cliente"
                />
                <div className="flex space-x-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        seleccionarCliente(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value=""
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clientesBase.map((cte, index) => (
                      <option key={index} value={cte.nombre}>
                        {cte.nombre} {cte.rfc ? `(${cte.rfc})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={guardarDatosCliente}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-1 text-sm"
                    title="Guardar datos del cliente"
                  >
                    <Database className="w-4 h-4" />
                    <span>Guardar</span>
                  </button>
                </div>
                {showClientSaved && (
                  <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md text-green-700 text-sm">
                    ✅ Cliente guardado exitosamente
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contacto
              </label>
              <input
                type="text"
                value={quote.cliente.contacto}
                onChange={(e) => setQuote({
                  ...quote,
                  cliente: { ...quote.cliente, contacto: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Persona de contacto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planta/Ubicación
              </label>
              <input
                type="text"
                value={quote.cliente.planta}
                onChange={(e) => setQuote({
                  ...quote,
                  cliente: { ...quote.cliente, planta: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: ZODIAC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={quote.cliente.telefono}
                onChange={(e) => setQuote({
                  ...quote,
                  cliente: { ...quote.cliente, telefono: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFC
              </label>
              <input
                type="text"
                value={quote.cliente.rfc}
                onChange={(e) => setQuote({
                  ...quote,
                  cliente: { ...quote.cliente, rfc: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="RFC del cliente"
              />
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="border-t pt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productos</h3>
            <button
              onClick={agregarProducto}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Clave</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Cantidad</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Unidad</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Descripción</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Presentación</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Moneda</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Precio</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Importe</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {quote.productos.map((producto, index) => (
                  <tr key={producto.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={producto.clave}
                        onChange={(e) => actualizarProducto(index, 'clave', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Q001"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={producto.unidad}
                        onChange={(e) => actualizarProducto(index, 'unidad', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {unidades.map(unidad => (
                          <option key={unidad} value={unidad}>{unidad}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={producto.descripcion}
                          onChange={(e) => actualizarProducto(index, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Descripción del producto"
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const productoSeleccionado = productosCatalogo.find(p => p.clave === e.target.value);
                              if (productoSeleccionado) {
                                seleccionarProducto(index, productoSeleccionado);
                              }
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          value=""
                        >
                          <option value="">-- Buscar en catálogo --</option>
                          {productosCatalogo.map((prod, idx) => (
                            <option key={idx} value={prod.clave}>
                              {prod.clave} - {prod.descripcion} - ${prod.precio} ({prod.moneda})
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={producto.presentacion}
                        onChange={(e) => actualizarProducto(index, 'presentacion', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="E - 4 Lt"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={producto.moneda}
                        onChange={(e) => actualizarProducto(index, 'moneda', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="M.N.">M.N.</option>
                        <option value="USD">USD</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={producto.precio}
                        onChange={(e) => actualizarProducto(index, 'precio', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm font-medium">
                        ${producto.importe.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => guardarProductoEnBase(producto)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Guardar en catálogo"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarProducto(index)}
                          className="text-red-600 hover:text-red-800"
                          disabled={quote.productos.length === 1}
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Condiciones */}
        <div className="border-t pt-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Condiciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo de Entrega
              </label>
              <input
                type="text"
                value={quote.condiciones.tiempoEntrega}
                onChange={(e) => setQuote({
                  ...quote,
                  condiciones: { ...quote.condiciones, tiempoEntrega: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condiciones de Pago
              </label>
              <input
                type="text"
                value={quote.condiciones.condicionesPago}
                onChange={(e) => setQuote({
                  ...quote,
                  condiciones: { ...quote.condiciones, condicionesPago: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Términos y Observaciones
              </label>
              <textarea
                value={quote.terminos}
                onChange={(e) => setQuote({ ...quote, terminos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Ej: TAMBORES DE PLASTICO DE 222 KG, PRECIOS CON TAMBOR INCLUIDO..."
              />
            </div>
          </div>
        </div>

        {/* Totales */}
        <div className="border-t pt-10">
          <div className="flex justify-end">
            <div className="w-80 space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="font-medium">Subtotal:</span>
                <span>${calcularSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">IVA (16%):</span>
                <span>${calcularIVA().toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">${calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="border-t pt-10 flex justify-end space-x-4">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center space-x-2 shadow-sm transition-all active:scale-95"
          >
            <Database className="w-4 h-4" />
            <span>Guardar Historial</span>
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Vista Previa</span>
          </button>
          <button
            onClick={descargarPDF}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>PDF Liviano</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteForm;