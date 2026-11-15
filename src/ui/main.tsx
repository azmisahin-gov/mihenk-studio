import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./studio.css";

const container = document.getElementById("kok");
if (!container) {
  throw new Error("Kök öğe bulunamadı.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
