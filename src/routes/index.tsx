import { createFileRoute } from "@tanstack/react-router";
import { ToDoPage } from "../features/to-do/ToDoPage.tsx";

export const Route = createFileRoute("/")({ component: ToDoPage });
