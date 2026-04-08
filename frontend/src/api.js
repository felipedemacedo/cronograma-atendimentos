import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor opcional para headers (se necessário no futuro)
export default api;
