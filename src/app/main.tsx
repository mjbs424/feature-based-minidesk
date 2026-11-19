import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/index.css";
import App from "./App.tsx";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const syncTheme = () => document.documentElement.classList.toggle("dark", prefersDark.matches);
syncTheme();
prefersDark.addEventListener("change", syncTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
