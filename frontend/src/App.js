import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";

import "./App.css";
import Tasks from "./pages/Tasks";
import Header from "./components/Header";
import Footer from "./components/Footer";

// Coque de l'application : en-tête, pages et session.
// Le jeton est lu dans localStorage. Sans session, /tasks renvoie vers la connexion.
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = useCallback(() => setIsAuthenticated(true), []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  }, []);

  return (
    <Router>
      <div className="App">
        <header className="header">
          <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/tasks" /> : <Login onLogin={handleLogin} />
              }
            />
            <Route path="/register" element={<Register />} />
            <Route
              path="/tasks"
              element={
                isAuthenticated ? (
                  <Tasks onAuthError={handleLogout} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
