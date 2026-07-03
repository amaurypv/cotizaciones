import React from 'react';
import { FileText, TrendingUp, Users, CheckCircle, Clock, XCircle, Send, AlertTriangle } from 'lucide-react';
import { getVigencia } from '../utils/vencimiento';

const ESTATUS_CONFIG = {
    'Enviada':     { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Send },
    'En revisión': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: Clock },
    'Aprobada':    { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle },
    'Rechazada':   { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle },
};

const Dashboard = ({ historial }) => {
    const now = new Date();
    const mesActual = historial.filter(c => {
        const d = new Date(c.fecha + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const montoMes = mesActual.reduce((s, c) => s + (c.total || 0), 0);
    const montoTotal = historial.reduce((s, c) => s + (c.total || 0), 0);

    const clientCount = {};
    historial.forEach(c => { clientCount[c.cliente] = (clientCount[c.cliente] || 0) + 1; });
    const topClientes = Object.entries(clientCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const byEstatus = { 'Enviada': 0, 'En revisión': 0, 'Aprobada': 0, 'Rechazada': 0 };
    historial.forEach(c => {
        const e = c.estatus || 'Enviada';
        if (byEstatus[e] !== undefined) byEstatus[e]++;
    });

    const recientes = historial.slice(0, 5);

    let numVencidas = 0, numPorVencer = 0;
    historial.forEach(c => {
        const { estado } = getVigencia(c.fecha, c.validez);
        if (estado === 'vencida') numVencidas++;
        else if (estado === 'porVencer') numPorVencer++;
    });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h2>

            {/* Aviso de vencimientos */}
            {(numVencidas > 0 || numPorVencer > 0) && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                        <span className="font-semibold">Cotizaciones que requieren atención: </span>
                        {numVencidas > 0 && <span>{numVencidas} vencida{numVencidas === 1 ? '' : 's'}</span>}
                        {numVencidas > 0 && numPorVencer > 0 && <span> · </span>}
                        {numPorVencer > 0 && <span>{numPorVencer} por vencer</span>}
                        <span className="text-amber-700 dark:text-amber-300"> — revísalas en <strong>Historial / BD</strong> para renovarlas y reenviarlas.</span>
                    </div>
                </div>
            )}

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<FileText className="w-6 h-6 text-blue-600" />}
                    bg="bg-blue-50 dark:bg-blue-900/20"
                    label="Cotizaciones este mes"
                    value={mesActual.length}
                />
                <StatCard
                    icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                    bg="bg-green-50 dark:bg-green-900/20"
                    label="Monto cotizado (mes)"
                    value={`$${montoMes.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
                />
                <StatCard
                    icon={<FileText className="w-6 h-6 text-purple-600" />}
                    bg="bg-purple-50 dark:bg-purple-900/20"
                    label="Total cotizaciones"
                    value={historial.length}
                />
                <StatCard
                    icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
                    bg="bg-indigo-50 dark:bg-indigo-900/20"
                    label="Monto total histórico"
                    value={`$${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Estado de cotizaciones */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-500" /> Estado de Cotizaciones
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(byEstatus).map(([estatus, count]) => {
                            const cfg = ESTATUS_CONFIG[estatus];
                            const pct = historial.length > 0 ? Math.round((count / historial.length) * 100) : 0;
                            return (
                                <div key={estatus}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{estatus}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{count} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top clientes */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" /> Clientes más frecuentes
                    </h3>
                    <div className="space-y-2">
                        {topClientes.map(([nombre, count], i) => (
                            <div key={nombre} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[180px]">{nombre}</span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{count} cot.</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cotizaciones recientes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" /> Cotizaciones recientes
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 dark:text-gray-400 text-xs border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-2 font-semibold">Fecha</th>
                                <th className="pb-2 font-semibold">Cliente</th>
                                <th className="pb-2 font-semibold">Folio</th>
                                <th className="pb-2 font-semibold text-right">Total</th>
                                <th className="pb-2 font-semibold text-center">Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recientes.map((c, i) => {
                                const cfg = ESTATUS_CONFIG[c.estatus || 'Enviada'];
                                return (
                                    <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                        <td className="py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX')}
                                        </td>
                                        <td className="py-2 font-medium text-gray-800 dark:text-gray-200 max-w-[180px] truncate">{c.cliente}</td>
                                        <td className="py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{c.folio}</td>
                                        <td className="py-2 text-right font-bold text-gray-800 dark:text-gray-100">${c.total.toFixed(2)}</td>
                                        <td className="py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                                                {c.estatus || 'Enviada'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, bg, label, value }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-0.5">{value}</p>
        </div>
    </div>
);

export default Dashboard;
