import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppShell } from "./features/AppShell";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element no encontrado");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
