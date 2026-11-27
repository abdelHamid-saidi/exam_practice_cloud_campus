import { act } from "react";
import { createRoot } from "react-dom/client";
import Alert from "./Alert";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderAlert(message) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(<Alert message={message} />);
  });
  return container;
}

test("n'affiche rien sans message", () => {
  const container = renderAlert("");
  expect(container.childElementCount).toBe(0);
});

test("affiche le message d'erreur", () => {
  const container = renderAlert("Identifiants invalides");
  expect(container.querySelector("[role='alert']").textContent).toBe(
    "Identifiants invalides"
  );
});
