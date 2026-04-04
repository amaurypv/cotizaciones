const API_URL = 'https://cotizacionesguba.work/api';

export const api = {
    // Clientes
    getClientes: async () => {
        const response = await fetch(`${API_URL}/clientes`);
        if (!response.ok) throw new Error('Error al obtener clientes');
        return response.json();
    },

    saveCliente: async (cliente) => {
        const response = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente),
        });
        if (!response.ok) throw new Error('Error al guardar cliente');
        return response.json();
    },

    // Cotizaciones
    getCotizaciones: async () => {
        const response = await fetch(`${API_URL}/cotizaciones`);
        if (!response.ok) throw new Error('Error al obtener cotizaciones');
        return response.json();
    },

    getCotizacion: async (folio) => {
        const response = await fetch(`${API_URL}/cotizaciones/${folio}`);
        if (!response.ok) throw new Error('Error al obtener cotización');
        return response.json();
    },

    saveCotizacion: async (cotizacion) => {
        const response = await fetch(`${API_URL}/cotizaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cotizacion),
        });
        if (!response.ok) throw new Error('Error al guardar cotización');
        return response.json();
    },

    // Catálogo de Productos
    getProductosCatalogo: async () => {
        const response = await fetch(`${API_URL}/productos_catalogo`);
        if (!response.ok) throw new Error('Error al obtener catálogo de productos');
        return response.json();
    },

    saveProductoCatalogo: async (producto) => {
        const response = await fetch(`${API_URL}/productos_catalogo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto),
        });
        if (!response.ok) throw new Error('Error al guardar producto');
        return response.json();
    }
};
