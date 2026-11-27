import React, { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api";
import TaskForm from "../components/TaskForm";
import Alert from "../components/Alert";

// Liste des tâches : chargement, ajout, modification du titre, statut terminé et suppression.
// onAuthError ferme la session si le jeton n'est plus accepté.
const Tasks = ({ onAuthError }) => {
  const [tasks, setTasks] = useState([]);
  const [feedback, setFeedback] = useState({ type: "success", message: "" });
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const fail = useCallback(
    (err, fallback) => {
      if (err.response?.status === 401) {
        onAuthError();
        return;
      }
      setFeedback({ type: "error", message: getErrorMessage(err, fallback) });
    },
    [onAuthError]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchTasks = async () => {
      try {
        const res = await api.get("/tasks");
        if (!cancelled) setTasks(res.data);
      } catch (err) {
        if (!cancelled) fail(err, "Impossible de charger les tâches.");
      }
    };

    fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [fail]);

  const addTask = (task) => {
    setTasks((prev) => [task, ...prev]);
    setFeedback({ type: "success", message: "Tâche ajoutée." });
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((task) => task._id !== id));
      if (editingId === id) setEditingId(null);
      setFeedback({ type: "success", message: "Tâche supprimée." });
    } catch (err) {
      fail(err, "Impossible de supprimer la tâche.");
    }
  };

  const saveEdit = async (id) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setFeedback({ type: "error", message: "Le titre de la tâche est obligatoire." });
      return;
    }

    try {
      const res = await api.put(`/tasks/${id}`, { title: trimmed });
      setTasks((prev) => prev.map((task) => (task._id === id ? res.data : task)));
      setEditingId(null);
      setEditTitle("");
      setFeedback({ type: "success", message: "Tâche modifiée." });
    } catch (err) {
      fail(err, "Impossible de modifier la tâche.");
    }
  };

  const toggleTask = async (task) => {
    try {
      const res = await api.put(`/tasks/${task._id}`, {
        isCompleted: !task.isCompleted,
      });
      setTasks((prev) => prev.map((item) => (item._id === task._id ? res.data : item)));
      setFeedback({ type: "success", message: "Tâche mise à jour." });
    } catch (err) {
      fail(err, "Impossible de mettre à jour la tâche.");
    }
  };

  return (
    <div className="container tasks-page">
      <h1>Mes Tâches</h1>
      <Alert type={feedback.type} message={feedback.message} />
      <TaskForm
        addTask={addTask}
        onAuthError={onAuthError}
        onError={(message) => setFeedback({ type: "error", message })}
      />
      {tasks.length === 0 ? (
        <p className="empty-state">Aucune tâche pour le moment.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li
              key={task._id}
              className={`task-item ${task.isCompleted ? "completed" : ""}`}
            >
              {editingId === task._id ? (
                <form
                  className="task-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEdit(task._id);
                  }}
                >
                  <input
                    type="text"
                    value={editTitle}
                    aria-label="Modifier le titre"
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <button type="submit" className="btn-secondary">
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Annuler
                  </button>
                </form>
              ) : (
                <>
                  <div className="task-main">
                    <span>{task.title}</span>
                    {task.description ? <small>{task.description}</small> : null}
                  </div>
                  <div className="task-actions">
                    <button type="button" className="btn-secondary" onClick={() => toggleTask(task)}>
                      {task.isCompleted ? "Réouvrir" : "Terminer"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingId(task._id);
                        setEditTitle(task.title);
                      }}
                    >
                      Modifier
                    </button>
                    <button type="button" onClick={() => deleteTask(task._id)}>
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tasks;
