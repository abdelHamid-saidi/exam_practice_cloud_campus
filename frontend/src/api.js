import axios from 'axios';

// Développement local : http://localhost:5000/api
// Image Docker : /api (Nginx relaie vers le service backend)
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

export default api;
