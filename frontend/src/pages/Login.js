import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api";
import Alert from "../components/Alert";

// Connexion. Affiche l'erreur de l'API et le message de succès après une inscription.
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Veuillez renseigner le nom d'utilisateur et le mot de passe.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });
      localStorage.setItem("token", res.data.token);
      if (onLogin) onLogin();
      navigate("/tasks");
    } catch (err) {
      setError(getErrorMessage(err, "Connexion impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>Connexion</h1>
      <Alert type="success" message={error ? "" : successMessage} />
      <Alert type="error" message={error} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login-username">Nom d'utilisateur</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p className="auth-links">
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </div>
  );
};

export default Login;
