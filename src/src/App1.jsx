import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Eye, Save, FileDown, Database } from 'lucide-react';
import './App.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  // Base de datos inicial de productos
  const productosIniciales = [
    { clave: '12352308', descripcion: 'CAB-O-SIL M5', unidad: 'CUBETA', unidadSAT: 'PZA', precio: 850.00 },
    { clave: '12141901', descripcion: 'HIPOCLORITO DE SODIO AL 13%', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 7.04 },
    { clave: '12352104', descripcion: 'ALCOHOL ISOPROPILICO', unidad: 'GALON USA', unidadSAT: 'GLI', precio: 180.00 },
    { clave: '12352400', descripcion: 'MEZCLA ACETATO DE ETILO ACETONA', unidad: 'GALON USA', unidadSAT: 'GLI', precio: 220.00 },
    { clave: '12352115', descripcion: 'ACETONA INDUSTRIAL', unidad: 'LITRO', unidadSAT: 'LTR', precio: 25.00 },
    { clave: '31211803', descripcion: 'THINNER ESTANDAR', unidad: 'GALON USA', unidadSAT: 'GLI', precio: 150.00 },
    { clave: '12352316', descripcion: 'SOSA CAUSTICA LIQUIDA AL 50%', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 12.50 },
    { clave: '41104213', descripcion: 'AGUA TRIDESTILADA', unidad: 'LITRO', unidadSAT: 'LTR', precio: 15.00 },
    { clave: '12352115', descripcion: 'METIL ETIL CETONA (MEK)', unidad: 'LITRO', unidadSAT: 'LTR', precio: 35.00 },
    { clave: '12352104', descripcion: 'ALCOHOL METILICO', unidad: 'LITRO', unidadSAT: 'LTR', precio: 22.00 },
    { clave: '41121800', descripcion: 'PROBETA GRADUADA DE 50 ML', unidad: 'PIEZA', unidadSAT: 'PZA', precio: 120.00 },
    { clave: '12141901', descripcion: 'HIPOCLORITO DE SODIO AL 6%', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 5.50 },
    { clave: '12191502', descripcion: 'EXSOL D40', unidad: 'LITRO', unidadSAT: 'LTR', precio: 28.00 },
    { clave: '15101503', descripcion: 'VARSOL', unidad: 'LITRO', unidadSAT: 'LTR', precio: 24.00 },
    { clave: '12191602', descripcion: 'ACETATO DE BUTILO', unidad: 'LITRO', unidadSAT: 'LTR', precio: 32.00 },
    { clave: '41104213', descripcion: 'AGUA DESTILADA', unidad: 'GALON USA', unidadSAT: 'GLI', precio: 45.00 },
    { clave: '12191601', descripcion: 'ALCOHOL ETILICO', unidad: 'LITRO', unidadSAT: 'LTR', precio: 30.00 },
    { clave: '12352005', descripcion: 'TOLUENO', unidad: 'LITRO', unidadSAT: 'LTR', precio: 26.00 },
    { clave: '12352400', descripcion: 'MEZCLA TEM', unidad: 'LITRO', unidadSAT: 'LTR', precio: 38.00 },
    { clave: '12352316', descripcion: 'SOSA CAUSTICA EN ESCAMAS', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 18.00 },
    { clave: '24122002', descripcion: 'ENVASE GALON INDUSTRIAL REDONDO NAT.', unidad: 'PIEZA', unidadSAT: 'PZA', precio: 65.00 },
    { clave: '51101716', descripcion: 'CLORURO DE METILENO', unidad: 'GALON USA', unidadSAT: 'GLI', precio: 280.00 },
    { clave: '12352301', descripcion: 'ACIDO CLORHIDRICO', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 8.50 },
    { clave: '12352319', descripcion: 'HIDROXIDO DE CALCIO (CAL QUIMICA)', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 15.00 },
    { clave: '10171601', descripcion: 'UREA', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 20.00 }
  ];

  // Base de datos inicial de clientes
  const clientesIniciales = [
    { nombre: 'CHEMICOMAYS DE MEXICO', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'ALFREDO GARCIA CHAVEZ', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'AIR CRUISERS COMPANY, LLC DBA SAFRAN AEROSYSTEMS EVACUATION', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'GRUPO AMERICAN INDUSTRIES', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'QUIMICA ESPECIALIZADA DARR', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'MARIA GUADALUPE RIVAS ARMENDARIZ', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'HAAS TCM DE MEXICO', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'SAFRAN ELECTRICAL & POWER MEXICO', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'YESENIA HOLGUIN SAUCEDO', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'BM CASTINGS', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'CONTITECH FLUID MEXICANA', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'R.S. HUGHES CO. INC.', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'ADVANCED DECORATIVE SYSTEMS MEXICO', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'AL SERVICIOS MULTIPLES EMPRESARIALES', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'PROVEEDORA DE SEGURIDAD INDUSTRIAL DEL GOLFO', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'BEBIDAS PURIFICADAS', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'MARTHA REBECA BECERRA MEDINA', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'RESA QUIMICOS INDUSTRIALES', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'JORGE MANUEL FLORES NEVAREZ', contacto: '', telefono: '', email: '', direccion: '' },
    { nombre: 'AXAY INDUSTRIAL', contacto: '', telefono: '', email: '', direccion: '' }
  ];

  const [baseProductos, setBaseProductos] = useState(() => {
    const saved = localStorage.getItem('baseProductos');
    return saved ? JSON.parse(saved) : productosIniciales;
  });

  const [baseClientes, setBaseClientes] = useState(() => {
    const saved = localStorage.getItem('baseClientes');
    return saved ? JSON.parse(saved) : clientesIniciales;
  });

  const [historialCotizaciones, setHistorialCotizaciones] = useState(() => {
    const saved = localStorage.getItem('historialCotizaciones');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cotizacion, setCotizacion] = useState({
    folio: '',
    fecha: new Date().toISOString().split('T')[0],
    cliente: {
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: ''
    },
    productos: [
      {
        id: 1,
        cantidad: 0,
        unidad: 'KILOGRAMO',
        unidadSAT: 'KGM',
        claveSAT: '',
        descripcion: '',
        precio: 0,
        importe: 0
      }
    ],
    validez: '30',
    tiempoEntrega: '',
    condicionesPago: '30 DIAS DE CREDITO',
    comentarios: ''
  });

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [mostrarGestionBD, setMostrarGestionBD] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState('productos');
  const printRef = useRef();

  const unidades = [
    { codigo: 'KGM', nombre: 'KILOGRAMO' },
    { codigo: 'LTR', nombre: 'LITRO' },
    { codigo: 'PZA', nombre: 'PIEZA' },
    { codigo: 'TNE', nombre: 'TONELADA' },
    { codigo: 'MTR', nombre: 'METRO' },
    { codigo: 'M2', nombre: 'METRO CUADRADO' },
    { codigo: 'GLI', nombre: 'GALON USA' },
    { codigo: 'CJA', nombre: 'CAJA' }
  ];

  // Funciones de cálculo
  const calcularImporte = (cantidad, precio) => cantidad * precio;
  const calcularSubtotal = () => cotizacion.productos.reduce((sum, producto) => sum + producto.importe, 0);
  const calcularIVA = () => calcularSubtotal() * 0.16;
  const calcularTotal = () => calcularSubtotal() + calcularIVA();

  // Función para convertir números a letras (versión completa)
  const numeroALetras = (numero) => {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    
    if (numero === 0) return 'CERO PESOS 00/100 M.N.';
    
    let entero = Math.floor(numero);
    const centavos = Math.round((numero - entero) * 100);
    
    let resultado = '';
    
    if (entero >= 1000000) {
      const millones = Math.floor(entero / 1000000);
      resultado += numeroALetras(millones).replace(' PESOS 00/100 M.N.', '') + ' MILLÓN';
      if (millones > 1) resultado += 'ES';
      resultado += ' ';
      entero %= 1000000;
    }
    
    if (entero >= 1000) {
      const miles = Math.floor(entero / 1000);
      if (miles === 1) {
        resultado += 'MIL ';
      } else {
        resultado += numeroALetras(miles).replace(' PESOS 00/100 M.N.', '') + ' MIL ';
      }
      entero %= 1000;
    }
    
    if (entero >= 100) {
      const centenas = Math.floor(entero / 100);
      const centenasPalabras = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
      if (entero === 100) {
        resultado += 'CIEN ';
      } else {
        resultado += centenasPalabras[centenas] + ' ';
      }
      entero %= 100;
    }
    
    if (entero >= 20) {
      const dec = Math.floor(entero / 10);
      const uni = entero % 10;
      resultado += decenas[dec];
      if (uni > 0) {
        resultado += ' Y ' + unidades[uni];
      }
    } else if (entero >= 10) {
      resultado += especiales[entero - 10];
    } else if (entero > 0) {
      resultado += unidades[entero];
    }
    
    return resultado.trim() + ` PESOS ${centavos.toString().padStart(2, '0')}/100 M.N.`;
  };

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    localStorage.setItem('baseProductos', JSON.stringify(baseProductos));
  }, [baseProductos]);

  useEffect(() => {
    localStorage.setItem('baseClientes', JSON.stringify(baseClientes));
  }, [baseClientes]);

  useEffect(() => {
    localStorage.setItem('historialCotizaciones', JSON.stringify(historialCotizaciones));
  }, [historialCotizaciones]);

  const actualizarProducto = (index, campo, valor) => {
    const nuevosProductos = [...cotizacion.productos];
    nuevosProductos[index][campo] = valor;
    
    if (campo === 'cantidad' || campo === 'precio') {
      nuevosProductos[index].importe = calcularImporte(
        parseFloat(nuevosProductos[index].cantidad) || 0,
        parseFloat(nuevosProductos[index].precio) || 0
      );
    }
    
    if (campo === 'unidad') {
      const unidadSeleccionada = unidades.find(u => u.nombre === valor);
      if (unidadSeleccionada) {
        nuevosProductos[index].unidadSAT = unidadSeleccionada.codigo;
      }
    }
    
    setCotizacion({...cotizacion, productos: nuevosProductos});
  };

  const seleccionarProducto = (index, productoSeleccionado) => {
    const nuevosProductos = [...cotizacion.productos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      claveSAT: productoSeleccionado.clave,
      descripcion: productoSeleccionado.descripcion,
      unidad: productoSeleccionado.unidad,
      unidadSAT: productoSeleccionado.unidadSAT,
      precio: productoSeleccionado.precio,
      importe: calcularImporte(nuevosProductos[index].cantidad || 0, productoSeleccionado.precio)
    };
    setCotizacion({...cotizacion, productos: nuevosProductos});
  };

  const seleccionarCliente = (clienteSeleccionado) => {
    setCotizacion({
      ...cotizacion,
      cliente: clienteSeleccionado
    });
  };

  const agregarProducto = () => {
    const nuevoProducto = {
      id: cotizacion.productos.length + 1,
      cantidad: 0,
      unidad: 'KILOGRAMO',
      unidadSAT: 'KGM',
      claveSAT: '',
      descripcion: '',
      precio: 0,
      importe: 0
    };
    setCotizacion({
      ...cotizacion,
      productos: [...cotizacion.productos, nuevoProducto]
    });
  };

  const eliminarProducto = (index) => {
    if (cotizacion.productos.length > 1) {
      const nuevosProductos = cotizacion.productos.filter((_, i) => i !== index);
      setCotizacion({...cotizacion, productos: nuevosProductos});
    }
  };

  const generarFolio = () => {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().substr(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const aleatorio = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `COT${año}${mes}${aleatorio}`;
  };

  const guardarCotizacion = () => {
    const folio = cotizacion.folio || generarFolio();
    
    const nuevaCotizacion = {
      id: Date.now(),
      folio: folio,
      fecha: cotizacion.fecha,
      cliente: cotizacion.cliente.nombre,
      productos: cotizacion.productos.map(p => p.descripcion).join(', '),
      total: calcularTotal(),
      fechaCreacion: new Date().toISOString()
    };
    
    setHistorialCotizaciones([...historialCotizaciones, nuevaCotizacion]);
    setCotizacion({...cotizacion, folio: folio});
    alert('Cotización guardada exitosamente');
  };

  const exportarHistorialExcel = () => {
    const csvContent = [
      ['Fecha Cotización', 'Cliente', 'Número Cotización', 'Productos Cotizados', 'Total'],
      ...historialCotizaciones.map(cot => [
        new Date(cot.fecha).toLocaleDateString('es-MX'),
        cot.cliente,
        cot.folio,
        cot.productos,
        `$${cot.total.toFixed(2)}`
      ])
    ].map(row => row.join(','))
    .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_cotizaciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const agregarNuevoProducto = (nuevoProducto) => {
    setBaseProductos([...baseProductos, nuevoProducto]);
  };

  const agregarNuevoCliente = (nuevoCliente) => {
    setBaseClientes([...baseClientes, nuevoCliente]);
  };

  const imprimirCotizacion = () => {
    window.print();
  };

  const descargarPDF = async () => {
    try {
      let revertir = false;
      if (!mostrarVistaPrevia) {
        setMostrarVistaPrevia(true);
        revertir = true;
        await new Promise((r) => setTimeout(r, 300));
      }

      const node = printRef.current;
      if (!node) return;

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const folio = cotizacion.folio || generarFolio();
      pdf.save(`cotizacion_${folio}.pdf`);

      if (revertir) setMostrarVistaPrevia(false);
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Hubo un problema al generar el PDF.');
    }
  };


  // Componentes auxiliares
  const FormularioNuevoProducto = ({ onAgregar }) => {
    const [producto, setProducto] = useState({
      clave: '',
      descripcion: '',
      unidad: 'KILOGRAMO',
      unidadSAT: 'KGM',
      precio: 0
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onAgregar(producto);
      setProducto({ clave: '', descripcion: '', unidad: 'KILOGRAMO', unidadSAT: 'KGM', precio: 0 });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded bg-gray-50">
        <h4 className="font-semibold text-gray-900">Agregar Nuevo Producto</h4>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Clave SAT"
            value={producto.clave}
            onChange={(e) => setProducto({...producto, clave: e.target.value})}
            className="px-3 py-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Descripción"
            value={producto.descripcion}
            onChange={(e) => setProducto({...producto, descripcion: e.target.value})}
            className="px-3 py-2 border rounded"
            required
          />
          <select
            value={producto.unidad}
            onChange={(e) => {
              const unidadSel = unidades.find(u => u.nombre === e.target.value);
              setProducto({...producto, unidad: e.target.value, unidadSAT: unidadSel?.codigo || ''});
            }}
            className="px-3 py-2 border rounded"
          >
            {unidades.map(u => (
              <option key={u.codigo} value={u.nombre}>{u.nombre}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Precio"
            value={producto.precio}
            onChange={(e) => setProducto({...producto, precio: parseFloat(e.target.value) || 0})}
            className="px-3 py-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Agregar Producto
        </button>
      </form>
    );
  };

  const FormularioNuevoCliente = ({ onAgregar }) => {
    const [cliente, setCliente] = useState({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onAgregar(cliente);
      setCliente({ nombre: '', contacto: '', telefono: '', email: '', direccion: '' });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded bg-gray-50">
        <h4 className="font-semibold text-gray-900">Agregar Nuevo Cliente</h4>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nombre/Empresa"
            value={cliente.nombre}
            onChange={(e) => setCliente({...cliente, nombre: e.target.value})}
            className="px-3 py-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Contacto"
            value={cliente.contacto}
            onChange={(e) => setCliente({...cliente, contacto: e.target.value})}
            className="px-3 py-2 border rounded"
          />
          <input
            type="tel"
            placeholder="Teléfono"
            value={cliente.telefono}
            onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
            className="px-3 py-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={cliente.email}
            onChange={(e) => setCliente({...cliente, email: e.target.value})}
            className="px-3 py-2 border rounded"
          />
          <div className="col-span-2">
            <textarea
              placeholder="Dirección"
              value={cliente.direccion}
              onChange={(e) => setCliente({...cliente, direccion: e.target.value})}
              className="w-full px-3 py-2 border rounded"
              rows={2}
            />
          </div>
        </div>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Agregar Cliente
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-blue-900">Sistema de Cotizaciones GUBA</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setMostrarGestionBD(!mostrarGestionBD)}
                className="no-print flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <Database className="w-4 h-4 mr-2" />
                Gestión BD
              </button>
              <button
                onClick={guardarCotizacion}
                className="no-print flex items-center px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </button>
              <button
                onClick={exportarHistorialExcel}
                className="no-print flex items-center px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Excel
              </button>
              <button
                onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
                className="no-print flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </button>
              <button
                className="no-print flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={descargarPDF}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
              </button>
              <button
                onClick={imprimirCotizacion}
                className="no-print flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* Gestión de Base de Datos */}
        {mostrarGestionBD && (
          <div className="p-6 border-b bg-gray-50">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setSeccionActiva('productos')}
                className={`px-4 py-2 rounded ${seccionActiva === 'productos' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Productos ({baseProductos.length})
              </button>
              <button
                onClick={() => setSeccionActiva('clientes')}
                className={`px-4 py-2 rounded ${seccionActiva === 'clientes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Clientes ({baseClientes.length})
              </button>
              <button
                onClick={() => setSeccionActiva('historial')}
                className={`px-4 py-2 rounded ${seccionActiva === 'historial' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Historial ({historialCotizaciones.length})
              </button>
            </div>

            {seccionActiva === 'productos' && (
              <div className="space-y-4">
                <FormularioNuevoProducto onAgregar={agregarNuevoProducto} />
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Clave</th>
                        <th className="px-2 py-1 text-left">Descripción</th>
                        <th className="px-2 py-1 text-left">Unidad</th>
                        <th className="px-2 py-1 text-right">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseProductos.map((producto, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-1">{producto.clave}</td>
                          <td className="px-2 py-1">{producto.descripcion}</td>
                          <td className="px-2 py-1">{producto.unidad}</td>
                          <td className="px-2 py-1 text-right">${producto.precio.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {seccionActiva === 'clientes' && (
              <div className="space-y-4">
                <FormularioNuevoCliente onAgregar={agregarNuevoCliente} />
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Nombre/Empresa</th>
                        <th className="px-2 py-1 text-left">Contacto</th>
                        <th className="px-2 py-1 text-left">Teléfono</th>
                        <th className="px-2 py-1 text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseClientes.map((cliente, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-1">{cliente.nombre}</td>
                          <td className="px-2 py-1">{cliente.contacto}</td>
                          <td className="px-2 py-1">{cliente.telefono}</td>
                          <td className="px-2 py-1">{cliente.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {seccionActiva === 'historial' && (
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Fecha</th>
                      <th className="px-2 py-1 text-left">Cliente</th>
                      <th className="px-2 py-1 text-left">Folio</th>
                      <th className="px-2 py-1 text-left">Productos</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialCotizaciones.map((cot, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-2 py-1">{new Date(cot.fecha).toLocaleDateString('es-MX')}</td>
                        <td className="px-2 py-1">{cot.cliente}</td>
                        <td className="px-2 py-1">{cot.folio}</td>
                        <td className="px-2 py-1 truncate max-w-xs" title={cot.productos}>{cot.productos}</td>
                        <td className="px-2 py-1 text-right">${cot.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!mostrarVistaPrevia ? (
          <div className="p-6 space-y-6">
            {/* Información de la Cotización */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folio
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={cotizacion.folio}
                    onChange={(e) => setCotizacion({...cotizacion, folio: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: COT2024001"
                  />
                  <button
                    onClick={() => setCotizacion({...cotizacion, folio: generarFolio()})}
                    className="px-3 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
                  >
                    Auto
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={cotizacion.fecha}
                  onChange={(e) => setCotizacion({...cotizacion, fecha: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validez (días)
                </label>
                <input
                  type="number"
                  value={cotizacion.validez}
                  onChange={(e) => setCotizacion({...cotizacion, validez: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Información del Cliente con Autocompletado */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre/Empresa
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cotizacion.cliente.nombre}
                      onChange={(e) => setCotizacion({
                        ...cotizacion,
                        cliente: {...cotizacion.cliente, nombre: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del cliente"
                    />
                    <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          const clienteSeleccionado = baseClientes.find(c => c.nombre === e.target.value);
                          if (clienteSeleccionado) {
                            seleccionarCliente(clienteSeleccionado);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      value=""
                    >
                      <option value="">-- Seleccionar cliente existente --</option>
                      {baseClientes.map((cliente, index) => (
                        <option key={index} value={cliente.nombre}>
                          {cliente.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={cotizacion.cliente.contacto}
                    onChange={(e) => setCotizacion({
                      ...cotizacion,
                      cliente: {...cotizacion.cliente, contacto: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={cotizacion.cliente.telefono}
                    onChange={(e) => setCotizacion({
                      ...cotizacion,
                      cliente: {...cotizacion.cliente, telefono: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={cotizacion.cliente.email}
                    onChange={(e) => setCotizacion({
                      ...cotizacion,
                      cliente: {...cotizacion.cliente, email: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <textarea
                    value={cotizacion.cliente.direccion}
                    onChange={(e) => setCotizacion({
                      ...cotizacion,
                      cliente: {...cotizacion.cliente, direccion: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Productos con Autocompletado */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Productos/Servicios</h3>
                <button
                  onClick={agregarProducto}
                  className="no-print flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Cantidad</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Unidad</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Clave SAT</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Descripción</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Precio</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Importe</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizacion.productos.map((producto, index) => (
                      <tr key={producto.id} className="border-t">
                        <td className="px-3 py-2">
                          <input
                            type="number"
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
                              <option key={unidad.codigo} value={unidad.nombre}>
                                {unidad.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={producto.claveSAT}
                            onChange={(e) => actualizarProducto(index, 'claveSAT', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Clave"
                          />
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
                                  const productoSeleccionado = baseProductos.find(p => p.descripcion === e.target.value);
                                  if (productoSeleccionado) {
                                    seleccionarProducto(index, productoSeleccionado);
                                  }
                                }
                                e.target.value = '';
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value=""
                            >
                              <option value="">-- Seleccionar producto --</option>
                              {baseProductos.map((prod, idx) => (
                                <option key={idx} value={prod.descripcion}>
                                  {prod.descripcion} - ${prod.precio}
                                </option>
                              ))}
                            </select>
                          </div>
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
                          <button
                            onClick={() => eliminarProducto(index)}
                            className="text-red-600 hover:text-red-800"
                            disabled={cotizacion.productos.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Términos y Condiciones */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Términos y Condiciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo de Entrega
                  </label>
                  <input
                    type="text"
                    value={cotizacion.tiempoEntrega}
                    onChange={(e) => setCotizacion({...cotizacion, tiempoEntrega: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: 15 días hábiles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condiciones de Pago
                  </label>
                  <input
                    type="text"
                    value={cotizacion.condicionesPago}
                    onChange={(e) => setCotizacion({...cotizacion, condicionesPago: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios Adicionales
                  </label>
                  <textarea
                    value={cotizacion.comentarios}
                    onChange={(e) => setCotizacion({...cotizacion, comentarios: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="border-t pt-6">
              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                    <span className="text-sm font-bold">${calcularSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">IVA (16%):</span>
                    <span className="text-sm font-bold">${calcularIVA().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-blue-600">${calcularTotal().toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {numeroALetras(calcularTotal())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Vista Previa para Imprimir
          <div ref={printRef} className="print-area p-8 bg-white" style={{fontFamily: 'Arial, sans-serif'}}>
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-blue-900 mb-2">QUÍMICA INDUSTRIAL AVANZADA GUBA</h1>
                  <div className="text-sm text-gray-700">
                    <p>DE LAS INDUSTRIAS No.Ext-7301, No.Int-A</p>
                    <p>NOMBRE DE DIOS, C.P.31110</p>
                    <p>Chihuahua, Chihuahua, MÉXICO</p>
                    <p>Teléfono: 6144819184</p>
                    <p>Correo: ventas@quimicaguba.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-blue-900 mb-2">COTIZACIÓN</h2>
                  <div className="text-sm">
                    <p><strong>FOLIO:</strong> {cotizacion.folio}</p>
                    <p><strong>FECHA:</strong> {new Date(cotizacion.fecha).toLocaleDateString('es-MX')}</p>
                    <p><strong>VALIDEZ:</strong> {cotizacion.validez} días</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-blue-900 mb-2">CLIENTE:</h3>
              <div className="text-sm">
                <p><strong>{cotizacion.cliente.nombre}</strong></p>
                {cotizacion.cliente.contacto && <p>Atención: {cotizacion.cliente.contacto}</p>}
                {cotizacion.cliente.telefono && <p>Tel: {cotizacion.cliente.telefono}</p>}
                {cotizacion.cliente.email && <p>Email: {cotizacion.cliente.email}</p>}
                {cotizacion.cliente.direccion && <p>{cotizacion.cliente.direccion}</p>}
              </div>
            </div>

            <table className="w-full border-collapse border border-gray-400 mb-6">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-400 px-2 py-2 text-left text-sm">Cantidad</th>
                  <th className="border border-gray-400 px-2 py-2 text-left text-sm">Unidad</th>
                  <th className="border border-gray-400 px-2 py-2 text-left text-sm">Unidad SAT</th>
                  <th className="border border-gray-400 px-2 py-2 text-left text-sm">Clave SAT</th>
                  <th className="border border-gray-400 px-2 py-2 text-left text-sm">Descripción</th>
                  <th className="border border-gray-400 px-2 py-2 text-right text-sm">Precio</th>
                  <th className="border border-gray-400 px-2 py-2 text-right text-sm">Importe</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.productos.map((producto, index) => (
                  <tr key={index}>
                    <td className="border border-gray-400 px-2 py-2 text-sm">{producto.cantidad}</td>
                    <td className="border border-gray-400 px-2 py-2 text-sm">{producto.unidad}</td>
                    <td className="border border-gray-400 px-2 py-2 text-sm">{producto.unidadSAT}</td>
                    <td className="border border-gray-400 px-2 py-2 text-sm">{producto.claveSAT}</td>
                    <td className="border border-gray-400 px-2 py-2 text-sm">{producto.descripcion}</td>
                    <td className="border border-gray-400 px-2 py-2 text-sm text-right">${producto.precio.toFixed(2)}</td>
                    <td className="border border-gray-400 px-2 py-2 text-sm text-right">${producto.importe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-6">
              <div className="w-80">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">SUBTOTAL:</span>
                  <span className="text-sm">${calcularSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">IVA:</span>
                  <span className="text-sm">${calcularIVA().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>TOTAL:</span>
                  <span>${calcularTotal().toFixed(2)}</span>
                </div>
                <div className="text-xs mt-2 text-center">
                  {numeroALetras(calcularTotal())}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              {cotizacion.tiempoEntrega && (
                <p><strong>Tiempo de Entrega:</strong> {cotizacion.tiempoEntrega}</p>
              )}
              {cotizacion.condicionesPago && (
                <p><strong>Condiciones de Pago:</strong> {cotizacion.condicionesPago}</p>
              )}
              {cotizacion.comentarios && (
                <div>
                  <p><strong>Comentarios:</strong></p>
                  <p>{cotizacion.comentarios}</p>
                </div>
              )}
            </div>

            <div className="mt-8 text-center text-sm text-gray-600">
              <p>Esta cotización es válida por {cotizacion.validez} días a partir de la fecha de emisión</p>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;