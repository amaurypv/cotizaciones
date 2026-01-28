import axios from 'axios';
const API_URL = 'https://api.cotizacionesguba.work';
const api = axios.create({
    baseURL: API_URL,
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);
export const authService = {
    login: async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        const response = await api.post('/token', formData);
        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        window.location.reload();
    },
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};
export default api;
