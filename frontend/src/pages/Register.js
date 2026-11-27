import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api";
import Alert from "../components/Alert";

// Création de compte. Contrôle les champs, puis renvoie vers la connexion en cas de succès.
const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Veuillez renseigner le nom d'utilisateur et le mot de passe.");
      return;
    }
    if (trimmedUsername.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        username: trimmedUsername,
        password,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Compte créé. Vous pouvez vous connecter." },
      });
    } catch (err) {
      setError(getErrorMessage(err, "Création du compte impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>Inscription</h1>
      <Alert type="error" message={error} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="register-username">Nom d'utilisateur</label>
          <input
            id="register-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-password">Mot de passe</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Création..." : "Créer le compte"}
        </button>
      </form>
      <p className="auth-links">
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  );
};

export default Register;
