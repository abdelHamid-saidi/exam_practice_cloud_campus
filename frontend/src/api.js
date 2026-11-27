import axios from "axios";

// Client HTTP. Ajoute le jeton de session à chaque appel vers l'API.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["x-auth-token"] = token;
  }
  return config;
});

// Texte d'erreur à afficher : message de l'API, ou un repli si le serveur ne répond pas.
export function getErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data && typeof data === "object" && typeof data.msg === "string" && data.msg.trim()) {
    return data.msg;
  }
  if (typeof data === "string" && data.trim() && data.length < 200) {
    return data;
  }
  if (!error?.response) {
    return "Impossible de contacter le serveur.";
  }
  return fallback;
}

export default api;
