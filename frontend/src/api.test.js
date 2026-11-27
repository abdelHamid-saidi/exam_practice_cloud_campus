import { apiBaseUrl, getErrorMessage } from "./api";

test("conserve une URL qui se termine déjà par /api", () => {
  expect(apiBaseUrl("http://localhost:5000/api/")).toBe("http://localhost:5000/api");
});

test("ajoute /api à l'origine Render", () => {
  expect(apiBaseUrl("https://exam-practice-api.onrender.com")).toBe(
    "https://exam-practice-api.onrender.com/api"
  );
});

test("affiche le message renvoyé par l'API", () => {
  const error = { response: { data: { msg: "Origine non autorisée" } } };
  expect(getErrorMessage(error, "Erreur")).toBe("Origine non autorisée");
});

test("signale un serveur injoignable", () => {
  expect(getErrorMessage(new Error("network"), "Erreur")).toBe(
    "Impossible de contacter le serveur."
  );
});
