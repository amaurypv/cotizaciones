import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { MOTIVOS_PERDIDA, ESTATUS_ABIERTOS, esCerrada, getResultadoMeta } from '../utils/resultado';

const hoy = new Date().toISOString().split('T')[0];

/**
 * Captura qué partidas aceptó el cliente. El resultado de la cotización (Ganada,
 * Ganada parcial o Perdida) lo deriva el backend a partir de estas marcas.
 */
const CierreModal = ({ cotizacion, onClose, onRegistrarCierre }) => {
    const [productos, setProductos] = useState([]);
    const [aceptados, setAceptados] = useState(new Set());
    const [fechaCierre, setFechaCierre] = useState(cotizacion.fechaCierre || hoy);
    const [motivo, setMotivo] = useState(cotizacion.motivoPerdida || '');
    const [nota, setNota] = useState(cotizacion.notaCierre || '');
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        apiClient.get(`/cotizaciones/${cotizacion.folio}`)
            .then(res => {
                const items = res.data.productos || [];
                setProductos(items);
                setAceptados(new Set(items.filter(p => p.aceptado).map(p => p.id)));
            })
            .catch(() => setError('No se pudieron cargar las partidas de la cotización.'))
            .finally(() => setLoading(false));
    }, [cotizacion.folio]);

    const toggle = (id) => {
        setAceptados(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const todasAceptadas = productos.length > 0 && aceptados.size === productos.length;
    const hayRechazadas = productos.length > 0 && aceptados.size < productos.length;

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onRegistrarCierre(cotizacion.folio, {
                accion: 'cerrar',
                aceptados: [...aceptados],
                fecha_cierre: fechaCierre,
                motivo_perdida: hayRechazadas ? motivo : '',
                nota_cierre: nota,
            });
            onClose();
        } catch {
            setError('No se pudo guardar el cierre.');
            setGuardando(false);
        }
    };

    // Deja la cotización sin cerrar en el estado indicado. Si venía cerrada, borra las marcas.
    const marcarAbierta = async (estatus) => {
        setGuardando(true);
        setError(null);
        try {
            await onRegistrarCierre(cotizacion.folio, { accion: 'reabrir', estatus_abierto: estatus });
            onClose();
        } catch {
            setError('No se pudo actualizar el estado.');
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Encabezado */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Resultado de la cotización</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {cotizacion.folio} · {cotizacion.cliente}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cuerpo */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {loading ? (
                        <p className="text-center text-gray-400 dark:text-gray-500 py-8">Cargando partidas...</p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    ¿Qué partidas aceptó el cliente?
                                </p>
                                <button
                                    onClick={() => setAceptados(new Set(productos.map(p => p.id)))}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
                                >
                                    <Check className="w-3.5 h-3.5" /> Aceptaron todo
                                </button>
                            </div>

                            <div className="border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                                {productos.map(p => (
                                    <label
                                        key={p.id}
                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={aceptados.has(p.id)}
                                            onChange={() => toggle(p.id)}
                                            className="w-4 h-4 accent-green-600 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{p.descripcion}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {p.clave} · {p.cantidad} {p.unidad}
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            ${(p.importe || 0).toFixed(2)} {p.moneda}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex-1">
                                    <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                        Fecha de cierre
                                    </span>
                                    <input
                                        type="date"
                                        value={fechaCierre}
                                        onChange={e => setFechaCierre(e.target.value)}
                                        className="w-full py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </label>
                                {hayRechazadas && (
                                    <label className="flex-1">
                                        <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                            Motivo de lo no vendido
                                        </span>
                                        <select
                                            value={motivo}
                                            onChange={e => setMotivo(e.target.value)}
                                            className="w-full py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="">Sin especificar</option>
                                            {MOTIVOS_PERDIDA.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </label>
                                )}
                            </div>

                            <label className="block">
                                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    Nota (opcional)
                                </span>
                                <textarea
                                    value={nota}
                                    onChange={e => setNota(e.target.value)}
                                    rows={2}
                                    placeholder="Detalle del caso, con quién se negoció, siguiente paso..."
                                    className="w-full py-2 px-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                />
                            </label>

                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {todasAceptadas
                                    ? 'Quedará como Ganada.'
                                    : aceptados.size === 0
                                        ? 'Quedará como Perdida.'
                                        : `Quedará como Ganada parcial (${aceptados.size} de ${productos.length}).`}
                            </p>

                            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                        </>
                    )}
                </div>

                {/* Pie */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                    {/* Estados sin cerrar: sirven tanto para avanzar una cotización viva
                        como para reabrir una que ya se había cerrado. */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Sin cerrar:</span>
                        {ESTATUS_ABIERTOS.map(estatus => {
                            const activo = cotizacion.estatus === estatus;
                            return (
                                <button
                                    key={estatus}
                                    onClick={() => marcarAbierta(estatus)}
                                    disabled={guardando || activo}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-100 ${
                                        activo
                                            ? getResultadoMeta(estatus).badge + ' cursor-default'
                                            : 'text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
                                    }`}
                                    title={esCerrada(cotizacion)
                                        ? `Reabrir: borra las marcas y deja la cotización en ${estatus}`
                                        : `Marcar como ${estatus}`}
                                >
                                    {esCerrada(cotizacion) && <RotateCcw className="w-3 h-3" />}
                                    {estatus}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={guardar}
                            disabled={loading || guardando}
                            className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                            {guardando ? 'Guardando...' : 'Guardar resultado'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CierreModal;
