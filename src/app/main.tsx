import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import "../styles/index.css";
import { router } from "./router.tsx";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const syncTheme = () => document.documentElement.classList.toggle("dark", prefersDark.matches);
syncTheme();
prefersDark.addEventListener("change", syncTheme);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
