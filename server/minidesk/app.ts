import { ApiError, missing } from "./errors.js";
import { categories, createTask, priorityTasks, taskItem, taskList, taskSummary } from "./tasks.js";
import {
  budgetItem,
  createExpense,
  expenseCategoriesSummary,
  expenseItem,
  expenseList,
  expenseSummary,
} from "./expenses.js";
import { action, active, discard, reconcile, sessions, start, summary } from "./focus.js";
import { ingest, overview } from "./rum.js";
import { idempotent, ok, query, rateLimit, readBody, requireDataset, type Result } from "./http.js";
import { withState, type Context } from "./store.js";

async function route(
  context: Context,
  request: Request,
  url: URL,
  path: string,
  body?: Record<string, unknown>,
): Promise<Result> {
  const method = request.method;
  if (method === "GET") {
    if (path === "demo") {
      query(url, []);
      return ok({
        datasetId: context.datasetId,
        timeZone: "UTC",
        currency: "USD",
        serverNow: context.now.toISOString(),
        resetAt: context.resetAt,
      });
    }
    if (path === "task-categories" || path === "expense-categories") {
      query(url, []);
      return categories(context, path === "task-categories" ? "task" : "expense", method);
    }
    if (path === "tasks") return taskList(context, url);
    if (path === "tasks/summary") {
      query(url, []);
      return taskSummary(context);
    }
    if (path === "expenses") return expenseList(context, url);
    if (path === "expenses/summary") return expenseSummary(context, url);
    if (path === "expenses/categories") return expenseCategoriesSummary(context, url);
    if (path === "focus/active") {
      query(url, []);
      return active(context);
    }
    if (path === "focus/priority-tasks") {
      query(url, []);
      return priorityTasks(context);
    }
    if (path === "focus/sessions") return sessions(context, url);
    if (path === "focus/summary") return summary(context, url);
    if (path === "rum/overview") {
      query(url, []);
      return overview(context);
    }
  }

  if (method !== "GET") {
    requireDataset(request, context);
    rateLimit(context);
  }

  if (method === "POST" && body) {
    if (path === "task-categories" || path === "expense-categories")
      return idempotent(context, request, `/${path}`, body, () =>
        categories(context, path === "task-categories" ? "task" : "expense", method, body),
      );
    if (path === "tasks") return createTask(context, request, body);
    if (path === "expenses") return createExpense(context, request, body);
    if (path === "focus/sessions") return start(context, request, body);
    if (path === "rum/events") return ingest(context, body);
  }

  const taskId = /^tasks\/([^/]+)$/.exec(path)?.[1];
  if (taskId && ["GET", "PATCH", "DELETE"].includes(method))
    return taskItem(context, method, taskId, request, body);
  const expenseId = /^expenses\/([^/]+)$/.exec(path)?.[1];
  if (expenseId && ["GET", "PATCH", "DELETE"].includes(method))
    return expenseItem(context, method, expenseId, request, body);
  const budgetMonth = /^budgets\/([^/]+)$/.exec(path)?.[1];
  if (budgetMonth && ["GET", "PUT"].includes(method))
    return budgetItem(context, method, budgetMonth, request, body);
  const focusAction = /^focus\/sessions\/([^/]+)\/(pause|resume|finish)$/.exec(path);
  if (focusAction && method === "POST" && body)
    return action(
      context,
      request,
      focusAction[1],
      focusAction[2] as "pause" | "resume" | "finish",
      body,
    );
  const focusId = /^focus\/sessions\/([^/]+)$/.exec(path)?.[1];
  if (focusId && method === "DELETE") return discard(context, request, focusId);
  missing();
}

function response(result: Result): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (result.location) headers.set("Location", result.location);
  if (result.status === 204) return new Response(null, { status: 204, headers });
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}

function errorResponse(error: unknown): Response {
  const known =
    error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "Server error");
  return response(
    ok(
      {
        error: {
          code: known.code,
          message: known.message,
          ...(known.fields ? { fields: known.fields } : {}),
        },
      },
      known.status,
    ),
  );
}

export async function handle(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const routeOverride = url.searchParams.get("__route");
    url.searchParams.delete("__route");
    const path = (routeOverride ?? url.pathname.replace(/^\/api\/minidesk\/v1\/?/, "")).replace(
      /^\/+|\/+$/g,
      "",
    );
    if (!path || path.includes("..") || path.includes("%")) missing();
    const method = request.method.toUpperCase();
    if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method))
      throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
    const body = ["POST", "PATCH", "PUT"].includes(method) ? await readBody(request) : undefined;
    const result = await withState(path, method, async (context) => {
      if (path.startsWith("focus/")) reconcile(context);
      return route(context, request, url, path, body);
    });
    return response(result);
  } catch (error) {
    return errorResponse(error);
  }
}
