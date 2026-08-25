import axios from 'axios';

const API_URL = 'https://cotizacionesguba.work/api';

// Margen antes de que expire el token en el que ya se pide uno nuevo.
const MARGEN_RENOVACION_MS = 60 * 60 * 1000;   // 1 hora
const INTERVALO_CHEQUEO_MS = 5 * 60 * 1000;    // revisa cada 5 min

const api = axios.create({
    baseURL: API_URL,
});

// --- Utilidades de token ---

// Lee el 'exp' del JWT sin verificar la firma (eso es cosa del backend).
const expiracionToken = (token) => {
    if (!token) return null;
    try {
        // El payload viene en base64url: atob no acepta '-' ni '_' ni falta de padding.
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

const msParaExpirar = () => {
    const exp = expiracionToken(localStorage.getItem('token'));
    return exp === null ? null : exp - Date.now();
};

const porExpirar = () => {
    const restante = msParaExpirar();
    return restante !== null && restante < MARGEN_RENOVACION_MS;
};

// --- Renovación deslizante ---
// Mientras el usuario tenga la app abierta, el token se renueva solo antes de
// vencer. Así una sesión activa no se corta a las 24 h a media cotización.

let renovacionEnCurso = null;

const renovarToken = () => {
    if (renovacionEnCurso) return renovacionEnCurso;
    renovacionEnCurso = api
        .post('/token/refresh', null, { _saltarRenovacion: true, _sinReautenticar: true })
        .then((res) => {
            if (res.data?.access_token) {
                localStorage.setItem('token', res.data.access_token);
                return true;
            }
            return false;
        })
        .catch(() => false)
        .finally(() => { renovacionEnCurso = null; });
    return renovacionEnCurso;
};

const renovarSiHaceFalta = () => {
    if (localStorage.getItem('token') && porExpirar()) return renovarToken();
    return Promise.resolve(false);
};

let temporizadorRenovacion = null;

export const iniciarRenovacionAutomatica = () => {
    if (temporizadorRenovacion) return;
    renovarSiHaceFalta();
    temporizadorRenovacion = setInterval(renovarSiHaceFalta, INTERVALO_CHEQUEO_MS);
    // El intervalo no corre si la máquina duerme o la pestaña queda de fondo,
    // así que también se revisa al volver a ella.
    window.addEventListener('focus', renovarSiHaceFalta);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) renovarSiHaceFalta();
    });
};

export const detenerRenovacionAutomatica = () => {
    if (temporizadorRenovacion) clearInterval(temporizadorRenovacion);
    temporizadorRenovacion = null;
};

// --- Reautenticación sin perder el trabajo en pantalla ---
// Si aun así el token murió (p. ej. la pestaña estuvo cerrada más de 24 h),
// no se recarga la página: se avisa a la app para que pida usuario y
// contraseña encima de lo que ya estaba capturado, y la petición que falló
// se reintenta sola al volver a entrar.

let esperandoReautenticacion = false;
const enEspera = [];

const pedirReautenticacion = () => new Promise((resolve) => {
    enEspera.push(resolve);
    if (!esperandoReautenticacion) {
        esperandoReautenticacion = true;
        window.dispatchEvent(new CustomEvent('sesion:expirada'));
    }
});

const resolverEspera = (exito) => {
    esperandoReautenticacion = false;
    while (enEspera.length) enEspera.shift()(exito);
};

export const hayReautenticacionPendiente = () => esperandoReautenticacion;

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(async (config) => {
    if (!config._saltarRenovacion) await renovarSiHaceFalta();
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para manejar errores de autenticación (401)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config || {};
        const esLogin = typeof config.url === 'string' && config.url.includes('/token');
        if (error.response?.status === 401 && !esLogin && !config._sinReautenticar && !config._reintentado) {
            config._reintentado = true;
            localStorage.removeItem('token');
            const reautenticado = await pedirReautenticacion();
            if (reautenticado) return api(config);
        }
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/token', formData, { _saltarRenovacion: true });
        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            iniciarRenovacionAutomatica();
            resolverEspera(true);
        }
        return response.data;
    },
    logout: () => {
        detenerRenovacionAutomatica();
        localStorage.removeItem('token');
        resolverEspera(false);
        window.location.reload();
    },
    isAuthenticated: () => {
        const restante = msParaExpirar();
        // Sin token, o con uno ya vencido, la sesión no sirve.
        return !!localStorage.getItem('token') && (restante === null || restante > 0);
    }
};

export default api;
