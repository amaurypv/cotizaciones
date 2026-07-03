// Utilidades para calcular la vigencia/vencimiento de una cotización.
// Una cotización vence en: fecha de emisión + días de validez.

const MS_POR_DIA = 1000 * 60 * 60 * 24;

// Umbral (en días) por defecto para marcar una cotización como "por vencer".
export const UMBRAL_POR_VENCER = 3;

/**
 * Calcula el estado de vigencia de una cotización.
 * @param {string} fecha - Fecha de emisión en formato 'YYYY-MM-DD'.
 * @param {string|number} validez - Días de validez.
 * @param {number} umbralPorVencer - Días de anticipación para marcar "por vencer".
 * @returns {{ estado: 'vigente'|'porVencer'|'vencida'|'desconocido', diasRestantes: number|null, fechaVencimiento: Date|null }}
 */
export function getVigencia(fecha, validez, umbralPorVencer = UMBRAL_POR_VENCER) {
    const dias = parseInt(validez, 10);
    if (!fecha || isNaN(dias)) {
        return { estado: 'desconocido', diasRestantes: null, fechaVencimiento: null };
    }

    const fechaVencimiento = new Date(fecha + 'T00:00:00');
    fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diasRestantes = Math.round((fechaVencimiento - hoy) / MS_POR_DIA);

    let estado;
    if (diasRestantes < 0) estado = 'vencida';
    else if (diasRestantes <= umbralPorVencer) estado = 'porVencer';
    else estado = 'vigente';

    return { estado, diasRestantes, fechaVencimiento };
}

// Estilos y etiqueta para cada estado de vigencia.
export const VIGENCIA_META = {
    vigente:     { label: 'Vigente',    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    porVencer:   { label: 'Por vencer', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    vencida:     { label: 'Vencida',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    // Vencida pero ya se envió una cotización actualizada que la reemplaza
    vencidaActualizada: { label: 'Vencida · Actualizada', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
    desconocido: { label: 'Sin datos',  badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

// Texto legible de días restantes/vencidos.
export function textoDiasRestantes(diasRestantes) {
    if (diasRestantes === null) return '—';
    if (diasRestantes < 0) return `Venció hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? '' : 's'}`;
    if (diasRestantes === 0) return 'Vence hoy';
    return `Vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`;
}
