import React, { useState, useEffect } from 'react';
import { Trash2, FileDown, Database, Search, Edit, Copy, Send, Mail, Eye, RefreshCw } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { generateNativePDF } from '../utils/pdfGenerator';
import { numeroALetras } from '../utils/numeroALetras';
import { getVigencia, VIGENCIA_META, textoDiasRestantes } from '../utils/vencimiento';

const ESTATUS_OPTIONS = ['Enviada', 'En revisión', 'Aprobada', 'Rechazada'];

const ESTATUS_STYLES = {
    'Enviada':     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'En revisión': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Aprobada':    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Rechazada':   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ManagementView = ({ historial, setHistorial, onLoadQuote }) => {
    const [seccionActiva, setSeccionActiva] = useState('historial');
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('searchTerm') || '');
    const [fechaDesde, setFechaDesde] = useState(() => sessionStorage.getItem('fechaDesde') || '');
    const [fechaHasta, setFechaHasta] = useState(() => sessionStorage.getItem('fechaHasta') || '');
    const [filtroCliente, setFiltroCliente] = useState(() => sessionStorage.getItem('filtroCliente') || '');
    const [filtroEstatus, setFiltroEstatus] = useState(() => sessionStorage.getItem('filtroEstatus') || '');
    const [filtroProducto, setFiltroProducto] = useState(() => sessionStorage.getItem('filtroProducto') || '');
    const [filtroVigencia, setFiltroVigencia] = useState(() => sessionStorage.getItem('filtroVigencia') || '');

    useEffect(() => {
        sessionStorage.setItem('searchTerm', searchTerm);
        sessionStorage.setItem('fechaDesde', fechaDesde);
        sessionStorage.setItem('fechaHasta', fechaHasta);
        sessionStorage.setItem('filtroCliente', filtroCliente);
        sessionStorage.setItem('filtroEstatus', filtroEstatus);
        sessionStorage.setItem('filtroProducto', filtroProducto);
        sessionStorage.setItem('filtroVigencia', filtroVigencia);
    }, [searchTerm, fechaDesde, fechaHasta, filtroCliente, filtroEstatus, filtroProducto, filtroVigencia]);
    const [baseProductos, setBaseProductos] = useState([]);
    const [baseClientes, setBaseClientes] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);
    const [editandoEmail, setEditandoEmail] = useState(null);
    const [emailTemp, setEmailTemp] = useState('');

    useEffect(() => {
        if (seccionActiva === 'productos' || seccionActiva === 'clientes') {
            setLoadingCatalogs(true);
            Promise.all([apiClient.get('/clientes'), apiClient.get('/productos_catalogo')])
                .then(([rc, rp]) => { setBaseClientes(rc.data); setBaseProductos(rp.data); })
                .catch(console.error)
                .finally(() => setLoadingCatalogs(false));
        }
    }, [seccionActiva]);

    const clientesUnicos = [...new Set(historial.map(c => c.cliente))].sort();

    const filteredHistorial = historial.filter(cot => {
        const matchSearch = cot.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cot.folio.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCliente = !filtroCliente || cot.cliente === filtroCliente;
        const matchEstatus = !filtroEstatus || (cot.estatus || 'Enviada') === filtroEstatus;
        const matchDesde = !fechaDesde || cot.fecha >= fechaDesde;
        const matchHasta = !fechaHasta || cot.fecha <= fechaHasta;
        const matchProducto = !filtroProducto || (cot.productos || '').toLowerCase().includes(filtroProducto.toLowerCase());
        const matchVigencia = !filtroVigencia || getVigencia(cot.fecha, cot.validez).estado === filtroVigencia;
        return matchSearch && matchCliente && matchEstatus && matchDesde && matchHasta && matchProducto && matchVigencia;
    });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const guardarEmailCliente = async (cliente) => {
        try {
            await apiClient.post('/clientes', { ...cliente, email: emailTemp });
            setBaseClientes(prev => prev.map(c => c.nombre === cliente.nombre ? { ...c, email: emailTemp } : c));
        } catch {
            alert('Error al guardar el email');
        } finally {
            setEditandoEmail(null);
        }
    };

    const handleSend = async (folio) => {
        try {
            const response = await apiClient.get(`/cotizaciones/${folio}`);
            const data = response.data;
            const subtotal = data.productos.reduce((s, p) => s + (p.importe || 0), 0);
            const iva = subtotal * 0.16;
            const totals = { subtotal, iva, total: subtotal + iva };

            const doc = await generateNativePDF(data, totals, numeroALetras);
            doc.save(`cotizacion_${folio}.pdf`);

            const email = data.cliente?.email || '';
            const subject = encodeURIComponent(`Cotización ${folio} - Química GUBA`);
            const body = encodeURIComponent(
                `Estimado/a ${data.cliente?.nombre || ''},\n\nAdjunto encontrará la cotización ${folio} solicitada.\n\nQuedamos a sus órdenes para cualquier aclaración.\n\nAtentamente,\nQuímica GUBA\n(614) 481-91-84\nventas@quimicaguba.com`
            );
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
            setTimeout(() => alert('📎 El PDF fue descargado. Adjúntalo al correo que se acaba de abrir.'), 500);
        } catch {
            alert('Error al preparar el envío');
        }
    };

    const handleDelete = async (folio) => {
        if (!confirm(`¿Eliminar cotización ${folio}?`)) return;
        try {
            await apiClient.delete(`/cotizaciones/${folio}`);
            setHistorial(prev => prev.filter(c => c.folio !== folio));
        } catch {
            alert('No se pudo eliminar la cotización.');
        }
    };

    const exportarCSV = () => {
        const rows = [
            ['Fecha', 'Cliente', 'Folio', 'Productos', 'Costo', 'Total', 'Estatus'],
            ...filteredHistorial.map(c => [
                new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX'),
                c.cliente, c.folio, c.productos,
                (c.total_costo || 0).toFixed(2),
                c.total.toFixed(2),
                c.estatus || 'Enviada',
            ])
        ].map(r => r.join(',')).join('\n');

        const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cotizaciones_${today}.csv`;
        link.click();
    };

    const tabBtn = (id, label) => (
        <button
            onClick={() => setSeccionActiva(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                seccionActiva === id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                            <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gestión de Datos e Historial</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {tabBtn('historial', `Historial (${historial.length})`)}
                        {tabBtn('productos', 'Catálogo Productos')}
                        {tabBtn('clientes', 'Base Clientes')}
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* HISTORIAL */}
                {seccionActiva === 'historial' && (
                    <div className="space-y-4">
                        {/* Filtros */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="relative lg:col-span-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente o folio..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                />
                            </div>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={e => setFechaDesde(e.target.value)}
                                title="Desde"
                                className="py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={e => setFechaHasta(e.target.value)}
                                title="Hasta"
                                className="py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <select
                                value={filtroEstatus}
                                onChange={e => setFiltroEstatus(e.target.value)}
                                className="py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value="">Todos los estados</option>
                                {ESTATUS_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <select
                                    value={filtroCliente}
                                    onChange={e => setFiltroCliente(e.target.value)}
                                    className="py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-56"
                                >
                                    <option value="">Todos los clientes</option>
                                    {clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por producto..."
                                        value={filtroProducto}
                                        onChange={e => setFiltroProducto(e.target.value)}
                                        className="w-full sm:w-56 pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                    />
                                </div>
                                <select
                                    value={filtroVigencia}
                                    onChange={e => setFiltroVigencia(e.target.value)}
                                    className="py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-44"
                                >
                                    <option value="">Toda vigencia</option>
                                    <option value="vigente">🟢 Vigentes</option>
                                    <option value="porVencer">🟡 Por vencer</option>
                                    <option value="vencida">🔴 Vencidas</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                {(searchTerm || fechaDesde || fechaHasta || filtroCliente || filtroEstatus || filtroProducto || filtroVigencia) && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setFechaDesde(''); setFechaHasta(''); setFiltroCliente(''); setFiltroEstatus(''); setFiltroProducto(''); setFiltroVigencia(''); }}
                                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                                <button
                                    onClick={exportarCSV}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                >
                                    <FileDown className="w-4 h-4" /> Exportar CSV
                                </button>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Cliente</th>
                                        <th className="px-4 py-3 text-left">Folio</th>
                                        <th className="px-4 py-3 text-left">Productos</th>
                                        <th className="px-4 py-3 text-left">Vigencia</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {filteredHistorial.length > 0 ? filteredHistorial.map((cot, i) => {
                                        const isToday = cot.fecha === today;
                                        const isYesterday = cot.fecha === yesterday;
                                        const vigencia = getVigencia(cot.fecha, cot.validez);
                                        const vigMeta = VIGENCIA_META[vigencia.estado];
                                        const requiereRenovar = vigencia.estado === 'vencida' || vigencia.estado === 'porVencer';
                                        return (
                                            <tr key={i} className={`transition-colors ${
                                                isToday
                                                    ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                    : isYesterday
                                                        ? 'bg-gray-50/50 dark:bg-gray-700/20 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                        : 'hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                                            }`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(cot.fecha + 'T00:00:00').toLocaleDateString('es-MX')}</span>
                                                        {isToday && <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Hoy</span>}
                                                        {isYesterday && <span className="text-xs text-gray-400 dark:text-gray-500">Ayer</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{cot.cliente}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                                                        {cot.folio}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-xs" title={cot.productos}>
                                                    {cot.productos}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-semibold ${vigMeta.badge}`}>
                                                            {vigMeta.label}
                                                        </span>
                                                        {vigencia.diasRestantes !== null && (
                                                            <span className={`text-xs ${vigencia.estado === 'vencida' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                {textoDiasRestantes(vigencia.diasRestantes)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => onLoadQuote(cot.folio, false, true)}
                                                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                                                            title="Ver cotización"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {requiereRenovar && (
                                                            <button
                                                                onClick={() => onLoadQuote(cot.folio, false, false, true)}
                                                                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg"
                                                                title="Renovar (nueva cotización con fecha de hoy)"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => onLoadQuote(cot.folio, false)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                                            title="Editar"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onLoadQuote(cot.folio, true)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                                                            title="Duplicar"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSend(cot.folio)}
                                                            className="p-1.5 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                                            title="Enviar por correo"
                                                        >
                                                            <Mail className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(cot.folio)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                                                No se encontraron cotizaciones con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {/* Total acumulado */}
                                {filteredHistorial.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                                            <td colSpan="5" className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">
                                                Total ({filteredHistorial.length} cotizaciones)
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* PRODUCTOS */}
                {seccionActiva === 'productos' && (
                    <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-semibold">
                                <tr>
                                    <th className="px-4 py-3 text-left">Clave</th>
                                    <th className="px-4 py-3 text-left">Descripción</th>
                                    <th className="px-4 py-3 text-left">Unidad</th>
                                    <th className="px-4 py-3 text-left">Proveedor</th>
                                    <th className="px-4 py-3 text-right">Costo (Int)</th>
                                    <th className="px-4 py-3 text-right">Precio</th>
                                    <th className="px-4 py-3 text-center">Moneda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {baseProductos.length > 0 ? baseProductos.map((prod, i) => (
                                    <tr key={i} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">{prod.clave}</td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{prod.descripcion}</td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{prod.unidad}</td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{prod.proveedor || '-'}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">${(prod.costo || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">${prod.precio.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded text-xs font-bold">
                                                {prod.moneda}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                                            {loadingCatalogs ? 'Cargando...' : 'No hay productos en el catálogo.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* CLIENTES */}
                {seccionActiva === 'clientes' && (
                    <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-semibold">
                                <tr>
                                    <th className="px-4 py-3 text-left">Nombre / Empresa</th>
                                    <th className="px-4 py-3 text-left">Contacto</th>
                                    <th className="px-4 py-3 text-left">RFC</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Planta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {baseClientes.length > 0 ? baseClientes.map((cte, i) => (
                                    <tr key={i} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{cte.nombre}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{cte.contacto || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{cte.rfc || '-'}</td>
                                        <td className="px-4 py-3 text-xs">
                                            {editandoEmail === cte.nombre ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        autoFocus
                                                        type="email"
                                                        value={emailTemp}
                                                        onChange={e => setEmailTemp(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') guardarEmailCliente(cte); if (e.key === 'Escape') setEditandoEmail(null); }}
                                                        className="border border-blue-400 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                                    />
                                                    <button onClick={() => guardarEmailCliente(cte)} className="text-green-600 hover:text-green-700 font-bold text-xs px-1">✓</button>
                                                    <button onClick={() => setEditandoEmail(null)} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => { setEditandoEmail(cte.nombre); setEmailTemp(cte.email || ''); }}
                                                    className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                                                    title="Clic para editar email"
                                                >
                                                    {cte.email || <span className="text-gray-300 dark:text-gray-600 italic">+ agregar email</span>}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{cte.planta || '-'}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                                            {loadingCatalogs ? 'Cargando...' : 'No hay clientes registrados.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagementView;
