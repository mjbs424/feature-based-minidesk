import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "../styles/index.css";
import { router } from "./router.tsx";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const syncTheme = () => document.documentElement.classList.toggle("dark", prefersDark.matches);
syncTheme();
prefersDark.addEventListener("change", syncTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
