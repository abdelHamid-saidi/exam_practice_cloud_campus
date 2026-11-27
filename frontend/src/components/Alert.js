import React from "react";

// Message de succès ou d'erreur. N'affiche rien si le texte est vide.
const Alert = ({ type = "error", message }) => {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`} role="alert" aria-live="polite">
      {message}
    </div>
  );
};

export default Alert;
