// Utilidades para el resultado de venta de una cotización.
// El resultado no se captura directamente: se deriva de qué partidas aceptó el cliente.
// Una cotización con todas sus partidas aceptadas es Ganada; con algunas, Ganada parcial;
// con ninguna, Perdida. El backend guarda el valor ya derivado en la columna `estatus`.

export const ESTATUS_ABIERTOS = ['Enviada', 'En negociación'];
export const ESTATUS_CERRADOS = ['Ganada', 'Ganada parcial', 'Perdida'];

// Histórico vencido que nunca se cerró. No es una venta perdida: es la ausencia del dato.
// Se archiva para que deje de aparecer en los avisos, pero queda fuera de la conversión
// para no contaminarla con desenlaces que nadie registró.
export const ESTATUS_SIN_DATO = 'Sin dato';

export const RESULTADO_OPTIONS = [...ESTATUS_ABIERTOS, ...ESTATUS_CERRADOS, ESTATUS_SIN_DATO];

export const MOTIVOS_PERDIDA = [
    'Precio',
    'Competencia',
    'Tiempo de entrega',
    'Sin respuesta del cliente',
    'Proyecto cancelado',
    'Producto no disponible',
    'Otro',
];

// Etiqueta y estilos de badge para cada resultado.
export const RESULTADO_META = {
    'Enviada':        { label: 'Enviada',        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    'En negociación': { label: 'En negociación', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    'Ganada':         { label: 'Ganada',         badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    'Ganada parcial': { label: 'Ganada parcial', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    'Perdida':        { label: 'Perdida',        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    'Sin dato':       { label: 'Sin dato',       badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

export const getResultadoMeta = (estatus) =>
    RESULTADO_META[estatus] || RESULTADO_META['Enviada'];

export const esCerrada = (cot) => ESTATUS_CERRADOS.includes(cot?.estatus);

export const esGanada = (cot) => cot?.estatus === 'Ganada' || cot?.estatus === 'Ganada parcial';

/** Archivada: sin desenlace conocido. No es cerrada ni sigue pendiente de seguimiento. */
export const esArchivada = (cot) => cot?.estatus === ESTATUS_SIN_DATO;

/** Ya no requiere atención: o se resolvió, o se archivó, o la reemplazó una renovación. */
export const estaResuelta = (cot) => esCerrada(cot) || esArchivada(cot) || !!cot?.renovadaPor;

/**
 * Quedan fuera de la conversión las renovadas (fueron reemplazadas, no rechazadas) y
 * las archivadas (nadie registró su desenlace). Incluirlas inventaría pérdidas que
 * nunca ocurrieron y hundiría la tasa con datos falsos.
 */
export const cuentaParaConversion = (cot) => !cot?.renovadaPor && !esArchivada(cot);

/** Texto de partidas aceptadas, p. ej. "3 de 5 partidas". */
export function textoPartidas(aceptadas, total) {
    if (!total) return '';
    return `${aceptadas || 0} de ${total} partida${total === 1 ? '' : 's'}`;
}

/**
 * Métricas de conversión sobre un historial de cotizaciones.
 * El porcentaje se calcula sobre las cerradas, no sobre el total: incluir las
 * pendientes en el denominador hundiría el número sin que se haya perdido nada.
 */
export function calcularConversion(historial) {
    const computables = historial.filter(cuentaParaConversion);
    const cerradas = computables.filter(esCerrada);
    const ganadas = cerradas.filter(esGanada);
    const abiertas = computables.length - cerradas.length;

    let partidasCerradas = 0, partidasAceptadas = 0;
    let montoAceptado = 0, costoAceptado = 0;
    cerradas.forEach(c => {
        partidasCerradas += c.itemsTotal || 0;
        partidasAceptadas += c.itemsAceptados || 0;
        montoAceptado += c.montoAceptado || 0;
        costoAceptado += c.costoAceptado || 0;
    });

    const motivos = {};
    cerradas.forEach(c => {
        if (c.motivoPerdida) motivos[c.motivoPerdida] = (motivos[c.motivoPerdida] || 0) + 1;
    });

    return {
        cerradas: cerradas.length,
        ganadas: ganadas.length,
        perdidas: cerradas.length - ganadas.length,
        abiertas,
        tasaCotizaciones: cerradas.length ? (ganadas.length / cerradas.length) * 100 : null,
        partidasCerradas,
        partidasAceptadas,
        tasaPartidas: partidasCerradas ? (partidasAceptadas / partidasCerradas) * 100 : null,
        montoAceptado,
        costoAceptado,
        // Un costo en cero significa que no se capturó, no que el producto salga gratis.
        // Calcular el margen igual daría 100% y haría creer que todo es ganancia.
        sinCosto: montoAceptado > 0 && costoAceptado === 0,
        // El monto subestima la venta real (se cotiza el mínimo y el cliente compra más),
        // pero el porcentaje de margen sí es representativo porque escala con el volumen.
        margenPct: (montoAceptado && costoAceptado)
            ? ((montoAceptado - costoAceptado) / montoAceptado) * 100
            : null,
        motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]),
    };
}
