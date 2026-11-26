import { randomUUID } from "node:crypto";
import { ApiError, bad, missing } from "./errors.js";
import {
  created,
  date,
  getById,
  idempotent,
  integer,
  month,
  noContent,
  ok,
  only,
  optionalText,
  parsePage,
  query,
  rateLimit,
  requiredQuery,
  requireVersion,
  text,
  type Result,
} from "./http.js";
import type { Expense } from "./model.js";
import type { Context } from "./store.js";

function fields(
  context: Context,
  body: Record<string, unknown>,
  previous?: Expense,
): Pick<Expense, "description" | "notes" | "amountMinor" | "categoryId" | "occurredOn"> {
  only(body, ["description", "notes", "amountMinor", "categoryId", "occurredOn"]);
  const result = {
    description:
      body.description === undefined && previous
        ? previous.description
        : (text(body.description, "description", 160) as string),
    notes:
      body.notes === undefined
        ? (previous?.notes ?? null)
        : optionalText(body.notes, "notes", 2000),
    amountMinor:
      body.amountMinor === undefined && previous
        ? previous.amountMinor
        : integer(body.amountMinor, "amountMinor", 1),
    categoryId:
      body.categoryId === undefined && previous
        ? previous.categoryId
        : (text(body.categoryId, "categoryId", 100) as string),
    occurredOn:
      body.occurredOn === undefined && previous
        ? previous.occurredOn
        : date(body.occurredOn, "occurredOn"),
  };
  if (!context.state.expenseCategories.some((item) => item.id === result.categoryId))
    bad("categoryId", "Unknown expense category");
  return result;
}

export function expenseList(context: Context, url: URL): Result {
  const params = query(url, ["month", "q", "categoryId", "limit", "cursor"]);
  const selectedMonth = params.has("month") ? month(params.get("month")) : null;
  const q = params.get("q");
  if (q !== null && (!q.trim() || q.length > 160)) bad("q", "Invalid search");
  const categoryId = params.get("categoryId");
  if (categoryId && !context.state.expenseCategories.some((item) => item.id === categoryId))
    bad("categoryId", "Unknown expense category");
  const items = context.state.expenses
    .filter(
      (item) =>
        (!selectedMonth || item.occurredOn.startsWith(selectedMonth)) &&
        (!categoryId || item.categoryId === categoryId) &&
        (!q || `${item.description} ${item.notes ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    )
    .sort(
      (a, b) =>
        b.occurredOn.localeCompare(a.occurredOn) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id),
    );
  return ok(
    parsePage(
      items,
      params,
      `${selectedMonth ?? ""}|${q ?? ""}|${categoryId ?? ""}`,
      context.datasetId,
    ),
  );
}

export async function createExpense(
  context: Context,
  request: Request,
  body: Record<string, unknown>,
): Promise<Result> {
  return idempotent(context, request, "/expenses", body, () => {
    rateLimit(context);
    const data = fields(context, body);
    if (context.state.expenses.length >= 1000)
      throw new ApiError(429, "RATE_LIMITED", "Expense capacity reached until the next reset");
    const now = context.now.toISOString();
    const item: Expense = {
      id: randomUUID(),
      ...data,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    context.state.expenses.push(item);
    return created(item, `/api/minidesk/v1/expenses/${item.id}`);
  });
}

export function expenseItem(
  context: Context,
  method: string,
  id: string,
  request: Request,
  body?: Record<string, unknown>,
): Result {
  const item = getById(context.state.expenses, id);
  if (method === "GET") return ok(item);
  requireVersion(request, item.version);
  if (method === "DELETE") {
    context.state.expenses = context.state.expenses.filter((value) => value.id !== id);
    return noContent();
  }
  if (method !== "PATCH" || !body) missing();
  Object.assign(item, fields(context, body, item));
  item.updatedAt = context.now.toISOString();
  item.version++;
  return ok(item);
}

function monthExpenses(context: Context, value: string): Expense[] {
  return context.state.expenses.filter((item) => item.occurredOn.startsWith(value));
}

export function expenseSummary(context: Context, url: URL): Result {
  const params = query(url, ["month"]);
  const selectedMonth = month(requiredQuery(params, "month"));
  const expenses = monthExpenses(context, selectedMonth);
  const spentMinor = expenses.reduce((sum, item) => sum + item.amountMinor, 0);
  const budget = context.state.budgets.find((item) => item.month === selectedMonth);
  const budgetMinor = budget?.amountMinor ?? null;
  return ok({
    month: selectedMonth,
    currency: "USD",
    expenseCount: expenses.length,
    spentMinor,
    budgetMinor,
    remainingMinor: budgetMinor === null ? null : budgetMinor - spentMinor,
    percentOfBudget:
      budgetMinor === null || budgetMinor === 0
        ? null
        : Math.round((spentMinor / budgetMinor) * 100),
  });
}

export function expenseCategoriesSummary(context: Context, url: URL): Result {
  const params = query(url, ["month"]);
  const selectedMonth = month(requiredQuery(params, "month"));
  const expenses = monthExpenses(context, selectedMonth);
  const spentMinor = expenses.reduce((sum, item) => sum + item.amountMinor, 0);
  const grouped = new Map<
    string,
    { categoryId: string; amountMinor: number; expenseCount: number; percentOfSpending: number }
  >();
  for (const expense of expenses) {
    const entry = grouped.get(expense.categoryId) ?? {
      categoryId: expense.categoryId,
      amountMinor: 0,
      expenseCount: 0,
      percentOfSpending: 0,
    };
    entry.amountMinor += expense.amountMinor;
    entry.expenseCount++;
    grouped.set(expense.categoryId, entry);
  }
  const items = [...grouped.values()]
    .map((entry) => ({
      ...entry,
      percentOfSpending: spentMinor === 0 ? 0 : Math.round((entry.amountMinor / spentMinor) * 100),
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.categoryId.localeCompare(b.categoryId));
  return ok({ month: selectedMonth, currency: "USD", spentMinor, items });
}

export function budgetItem(
  context: Context,
  method: string,
  value: string,
  request: Request,
  body?: Record<string, unknown>,
): Result {
  const selectedMonth = month(value);
  const existing = context.state.budgets.find((item) => item.month === selectedMonth);
  if (method === "GET") {
    if (!existing) missing();
    return ok(existing);
  }
  if (method !== "PUT" || !body) missing();
  only(body, ["amountMinor"]);
  const amountMinor = integer(body.amountMinor, "amountMinor", 0);
  if (existing) {
    requireVersion(request, existing.version);
    existing.amountMinor = amountMinor;
    existing.updatedAt = context.now.toISOString();
    existing.version++;
    return ok(existing);
  }
  if (request.headers.has("if-match")) bad("If-Match", "No budget exists yet");
  const budget = {
    month: selectedMonth,
    amountMinor,
    currency: "USD" as const,
    updatedAt: context.now.toISOString(),
    version: 1,
  };
  context.state.budgets.push(budget);
  return created(budget, `/api/minidesk/v1/budgets/${selectedMonth}`);
}
