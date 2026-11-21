import { createFileRoute } from "@tanstack/react-router";
import { ExpensesPage } from "../features/expenses/ExpensesPage.tsx";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });
