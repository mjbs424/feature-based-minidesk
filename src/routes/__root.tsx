import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NotFoundPage } from "../features/not-found/NotFoundPage.tsx";

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});
