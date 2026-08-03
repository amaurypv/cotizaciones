import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Users, Target, Clock, Percent, AlertTriangle, PackageSearch, PhoneCall } from 'lucide-react';
import { getVigencia } from '../utils/vencimiento';
import { getResultadoMeta, estaResuelta, calcularConversion } from '../utils/resultado';
import apiClient from '../utils/apiClient';

const Dashboard = ({ historial }) => {
    const now = new Date();
    const [porProducto, setPorProducto] = useState([]);
    const [oportunidades, setOportunidades] = useState([]);

    useEffect(() => {
        // Ambos reportes necesitan agregados que el historial no trae.
        apiClient.get('/reportes/conversion_productos')
            .then(res => setPorProducto(res.data))
            .catch(() => setPorProducto([]));
        apiClient.get('/reportes/oportunidades')
            .then(res => setOportunidades(res.data))
            .catch(() => setOportunidades([]));
    }, [historial]);

    const mesActual = historial.filter(c => {
        const d = new Date(c.fecha + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const montoMes = mesActual.reduce((s, c) => s + (c.total || 0), 0);

    const clientCount = {};
    historial.forEach(c => { clientCount[c.cliente] = (clientCount[c.cliente] || 0) + 1; });
    const topClientes = Object.entries(clientCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const conv = calcularConversion(historial);

    const recientes = historial.slice(0, 5);

    // El aviso solo aplica a cotizaciones abiertas: una ya cerrada no requiere seguimiento.
    let numVencidas = 0, numPorVencer = 0;
    historial.forEach(c => {
        if (estaResuelta(c)) return;
        const { estado } = getVigencia(c.fecha, c.validez);
        if (estado === 'vencida') numVencidas++;
        else if (estado === 'porVencer') numPorVencer++;
    });

    const pct = (v) => v === null ? '—' : `${Math.round(v)}%`;
    const money = (v) => `$${(v || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

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
                        <span className="text-amber-700 dark:text-amber-300"> — todas siguen sin resultado registrado. Revísalas en <strong>Historial / BD</strong> para renovarlas, o márcalas como ganadas o perdidas para que la conversión refleje la realidad.</span>
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
                    value={money(montoMes)}
                />
                <StatCard
                    icon={<Target className="w-6 h-6 text-purple-600" />}
                    bg="bg-purple-50 dark:bg-purple-900/20"
                    label="Tasa de conversión"
                    value={pct(conv.tasaCotizaciones)}
                    hint={conv.cerradas ? `${conv.ganadas} de ${conv.cerradas} cerradas` : 'Sin cotizaciones cerradas'}
                />
                <StatCard
                    icon={<Percent className="w-6 h-6 text-indigo-600" />}
                    bg="bg-indigo-50 dark:bg-indigo-900/20"
                    label="Margen sobre lo aceptado"
                    value={pct(conv.margenPct)}
                    hint={conv.sinCosto
                        ? 'Falta capturar el costo'
                        : conv.montoAceptado ? `${money(conv.montoAceptado)} cotizados` : 'Sin datos'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversión */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-500" /> Conversión
                    </h3>

                    {conv.cerradas === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-4">
                            Aún no hay cotizaciones con resultado. Márcalas desde <strong>Historial / BD</strong>
                            para empezar a medir cuántas se convierten en venta.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <Barra
                                label="Por cotización"
                                detalle={`${conv.ganadas} ganadas · ${conv.perdidas} perdidas`}
                                valor={conv.tasaCotizaciones}
                            />
                            <Barra
                                label="Por partida"
                                detalle={`${conv.partidasAceptadas} de ${conv.partidasCerradas} partidas aceptadas`}
                                valor={conv.tasaPartidas}
                            />
                            <div className="pt-2 border-t border-gray-50 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>{conv.abiertas} cotizacion{conv.abiertas === 1 ? '' : 'es'} sin resultado, fuera del cálculo.</p>
                                <p className="text-gray-400 dark:text-gray-500">
                                    Los montos son los cotizados: subestiman la venta real porque el cliente
                                    suele comprar más de lo que se le cotizó.
                                </p>
                            </div>
                        </div>
                    )}
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

            {/* Oportunidades de re-cotización */}
            {oportunidades.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-purple-500" /> Oportunidades de re-cotización
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                        Clientes con cotizaciones vencidas sin cerrar. Entre más te han cotizado,
                        más vale la pena la llamada.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400 text-xs border-b border-gray-100 dark:border-gray-700">
                                    <th className="pb-2 font-semibold">Cliente</th>
                                    <th className="pb-2 font-semibold text-center">Vencidas sin cerrar</th>
                                    <th className="pb-2 font-semibold text-center">Total cotizadas</th>
                                    <th className="pb-2 font-semibold text-right">Última</th>
                                </tr>
                            </thead>
                            <tbody>
                                {oportunidades.slice(0, 8).map(o => (
                                    <tr key={o.cliente_nombre} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                        <td className="py-2 font-medium text-gray-800 dark:text-gray-200 max-w-[220px] truncate" title={o.cliente_nombre}>
                                            {o.cliente_nombre}
                                        </td>
                                        <td className="py-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                            {o.vencidas_abiertas}
                                        </td>
                                        <td className="py-2 text-center text-gray-500 dark:text-gray-400">{o.total_cotizaciones}</td>
                                        <td className="py-2 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {o.ultima_cotizacion
                                                ? new Date(o.ultima_cotizacion + 'T00:00:00').toLocaleDateString('es-MX')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Motivos de pérdida */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-purple-500" /> Por qué se pierden ventas
                    </h3>
                    {conv.motivos.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                            Sin motivos registrados todavía.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {conv.motivos.map(([motivo, count]) => {
                                const total = conv.motivos.reduce((s, [, n]) => s + n, 0);
                                const p = Math.round((count / total) * 100);
                                return (
                                    <div key={motivo} className="flex items-center gap-3">
                                        <span className="text-sm text-gray-700 dark:text-gray-200 w-44 truncate">{motivo}</span>
                                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${p}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Conversión por producto */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                        <PackageSearch className="w-4 h-4 text-purple-500" /> Conversión por producto
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                        Un producto muy cotizado y poco aceptado suele significar precio fuera de mercado.
                    </p>
                    {porProducto.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                            Aparecerá cuando registres el resultado de algunas cotizaciones.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 dark:text-gray-400 text-xs border-b border-gray-100 dark:border-gray-700">
                                        <th className="pb-2 font-semibold">Producto</th>
                                        <th className="pb-2 font-semibold text-center">Cotizado</th>
                                        <th className="pb-2 font-semibold text-center">Aceptado</th>
                                        <th className="pb-2 font-semibold text-right">Conversión</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {porProducto.slice(0, 8).map(p => {
                                        const tasa = Math.round((p.veces_aceptado / p.veces_cotizado) * 100);
                                        const color = tasa >= 60 ? 'text-green-600 dark:text-green-400'
                                            : tasa >= 30 ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-red-600 dark:text-red-400';
                                        return (
                                            <tr key={p.clave} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                <td className="py-2 text-gray-700 dark:text-gray-200 max-w-[200px] truncate" title={p.descripcion}>
                                                    {p.descripcion}
                                                </td>
                                                <td className="py-2 text-center text-gray-500 dark:text-gray-400">{p.veces_cotizado}</td>
                                                <td className="py-2 text-center text-gray-500 dark:text-gray-400">{p.veces_aceptado}</td>
                                                <td className={`py-2 text-right font-bold ${color}`}>{tasa}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                                <th className="pb-2 font-semibold text-center">Resultado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recientes.map((c, i) => {
                                const meta = getResultadoMeta(c.estatus);
                                return (
                                    <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                        <td className="py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX')}
                                        </td>
                                        <td className="py-2 font-medium text-gray-800 dark:text-gray-200 max-w-[180px] truncate">{c.cliente}</td>
                                        <td className="py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{c.folio}</td>
                                        <td className="py-2 text-right font-bold text-gray-800 dark:text-gray-100">${c.total.toFixed(2)}</td>
                                        <td className="py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
                                                {meta.label}
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

const Barra = ({ label, detalle, valor }) => (
    <div>
        <div className="flex justify-between items-baseline text-sm mb-1">
            <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
            <span className="font-bold text-gray-800 dark:text-gray-100">
                {valor === null ? '—' : `${Math.round(valor)}%`}
            </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-500" style={{ width: `${valor || 0}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{detalle}</p>
    </div>
);

const StatCard = ({ icon, bg, label, value, hint }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-0.5">{value}</p>
            {hint && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{hint}</p>}
        </div>
    </div>
);

export default Dashboard;
