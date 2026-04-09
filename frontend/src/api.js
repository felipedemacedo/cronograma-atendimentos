import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Interceptor opcional para headers (se necessário no futuro)
export default api;
