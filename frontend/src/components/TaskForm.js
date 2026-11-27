import React, { useState } from "react";
import api, { getErrorMessage } from "../api";

// Formulaire d'ajout. Un titre vide est refusé ici ; le HTML est refusé par l'API.
const TaskForm = ({ addTask, onAuthError, onError }) => {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      onError("Le titre de la tâche est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/tasks", { title: trimmed });
      addTask(res.data);
      setTitle("");
    } catch (err) {
      if (err.response?.status === 401 && onAuthError) {
        onAuthError();
        return;
      }
      onError(getErrorMessage(err, "Impossible d'ajouter la tâche."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-group" noValidate>
      <input
        type="text"
        placeholder="Ajouter une tâche ..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Titre de la tâche"
      />
      <button type="submit" className="btn" style={{ marginTop: "10px" }} disabled={submitting}>
        {submitting ? "Ajout..." : "Ajouter Tâche"}
      </button>
    </form>
  );
};

export default TaskForm;
