import { createFileRoute } from "@tanstack/react-router";
import { FocusPage } from "../features/focus/FocusPage.tsx";

export const Route = createFileRoute("/focus")({ component: FocusPage });
