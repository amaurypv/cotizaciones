import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileDown, Database, Search, Edit } from 'lucide-react';

const ManagementView = ({ historial, setHistorial, onLoadQuote }) => {
    const [seccionActiva, setSeccionActiva] = useState('historial');
    const [searchTerm, setSearchTerm] = useState('');

    // Estos estados se sincronizarán con localStorage (App.jsx ya maneja historial)
    // Para productos y clientes, usaremos los que ya existen en localStorage o valores base
    const [baseProductos, setBaseProductos] = useState([]);
    const [baseClientes, setBaseClientes] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);

    useEffect(() => {
        const fetchCatalogs = async () => {
            setLoadingCatalogs(true);
            try {
                // Fetch Clientes
                const resClientes = await fetch('http://localhost:8000/clientes');
                if (resClientes.ok) {
                    const data = await resClientes.json();
                    setBaseClientes(data);
                }

                // Fetch Productos
                const resProductos = await fetch('http://localhost:8000/productos_catalogo');
                if (resProductos.ok) {
                    const data = await resProductos.json();
                    setBaseProductos(data);
                }
            } catch (error) {
                console.error('Error fetching catalogs:', error);
            } finally {
                setLoadingCatalogs(false);
            }
        };

        if (seccionActiva === 'productos' || seccionActiva === 'clientes') {
            fetchCatalogs();
        }
    }, [seccionActiva]);

    const exportarHistorialExcel = () => {
        const csvContent = [
            ['Fecha Cotización', 'Cliente', 'Número Cotización', 'Productos Cotizados', 'Total'],
            ...historial.map(cot => [
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

    const filteredHistorial = historial.filter(cot =>
        cot.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cot.folio.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden fade-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Database className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Gestión de Datos e Historial</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSeccionActiva('historial')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${seccionActiva === 'historial' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            Historial ({historial.length})
                        </button>
                        <button
                            onClick={() => setSeccionActiva('productos')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${seccionActiva === 'productos' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            Catálogo Productos
                        </button>
                        <button
                            onClick={() => setSeccionActiva('clientes')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${seccionActiva === 'clientes' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            Base Clientes
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {seccionActiva === 'historial' && (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente o folio..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={exportarHistorialExcel}
                                className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <FileDown className="w-4 h-4 mr-2" />
                                Exportar Excel
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Cliente</th>
                                        <th className="px-4 py-3 text-left">Folio</th>
                                        <th className="px-4 py-3 text-left">Resumen Productos</th>
                                        <th className="px-4 py-3 text-right">Costo (Int)</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredHistorial.length > 0 ? (
                                        filteredHistorial.map((cot, index) => (
                                            <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                                                    {new Date(cot.fecha).toLocaleDateString('es-MX')}
                                                </td>
                                                <td className="px-4 py-4 font-medium text-gray-900">{cot.cliente}</td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                                                        {cot.folio}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-gray-500 truncate max-w-xs" title={cot.productos}>
                                                    {cot.productos}
                                                </td>
                                                <td className="px-4 py-4 text-right font-medium text-gray-500">
                                                    ${(cot.total_costo || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-gray-900">
                                                    ${cot.total.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => onLoadQuote(cot.folio)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Cargar cotización"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-12 text-center text-gray-400">
                                                No se encontraron cotizaciones.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {seccionActiva === 'productos' && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-semibold">
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
                                <tbody className="divide-y divide-gray-50">
                                    {baseProductos.length > 0 ? (
                                        baseProductos.map((prod, index) => (
                                            <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                                <td className="px-4 py-4 font-mono text-xs text-purple-600 font-semibold">{prod.clave}</td>
                                                <td className="px-4 py-4 text-gray-900 font-medium">{prod.descripcion}</td>
                                                <td className="px-4 py-4 text-gray-500">{prod.unidad}</td>
                                                <td className="px-4 py-4 text-gray-500 text-xs">{prod.proveedor || '-'}</td>
                                                <td className="px-4 py-4 text-right text-gray-500">${(prod.costo || 0).toFixed(2)}</td>
                                                <td className="px-4 py-4 text-right font-bold text-gray-900">${prod.precio.toFixed(2)}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-bold">
                                                        {prod.moneda}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-12 text-center text-gray-400">
                                                {loadingCatalogs ? 'Cargando productos...' : 'No hay productos en el catálogo.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {seccionActiva === 'clientes' && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Nombre / Empresa</th>
                                        <th className="px-4 py-3 text-left">Contacto</th>
                                        <th className="px-4 py-3 text-left">RFC</th>
                                        <th className="px-4 py-3 text-left">Email</th>
                                        <th className="px-4 py-3 text-left">Planta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {baseClientes.length > 0 ? (
                                        baseClientes.map((cte, index) => (
                                            <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                                <td className="px-4 py-4 font-bold text-gray-900">{cte.nombre}</td>
                                                <td className="px-4 py-4 text-gray-600">{cte.contacto || '-'}</td>
                                                <td className="px-4 py-4 font-mono text-xs text-gray-500">{cte.rfc || '-'}</td>
                                                <td className="px-4 py-4 text-gray-500 text-xs">{cte.email || '-'}</td>
                                                <td className="px-4 py-4 text-gray-600">{cte.planta || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-12 text-center text-gray-400">
                                                {loadingCatalogs ? 'Cargando clientes...' : 'No hay clientes registrados.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagementView;
