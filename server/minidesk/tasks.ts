import { randomUUID } from "node:crypto";
import { ApiError, bad, conflict, missing } from "./errors.js";
import {
  boolean,
  created,
  date,
  getById,
  idempotent,
  noContent,
  ok,
  only,
  optionalText,
  parsePage,
  query,
  rateLimit,
  requireVersion,
  text,
  time,
  type Result,
} from "./http.js";
import type { Category, Task } from "./model.js";
import type { Context } from "./store.js";

const publicTask = ({ prioritySelectedAt: _prioritySelectedAt, ...task }: Task) => task;

export function categories(
  context: Context,
  kind: "task" | "expense",
  method: string,
  body?: Record<string, unknown>,
): Result {
  const items = kind === "task" ? context.state.taskCategories : context.state.expenseCategories;
  if (method === "GET") {
    const defaults = items.filter((item) => item.isDefault);
    const custom = items
      .filter((item) => !item.isDefault)
      .sort((a, b) => a.label.localeCompare(b.label));
    return ok({ items: [...defaults, ...custom] });
  }
  if (method !== "POST" || !body) missing();
  only(body, ["label"]);
  const label = text(body.label, "label", 40) as string;
  if (items.some((item) => item.label.toLowerCase() === label.toLowerCase())) conflict();
  if (items.filter((item) => !item.isDefault).length >= 20) conflict();
  const item: Category = { id: randomUUID(), label, isDefault: false };
  items.push(item);
  return ok(item, 201);
}

function validateFields(
  body: Record<string, unknown>,
  previous?: Task,
): Pick<Task, "title" | "notes" | "categoryId" | "dueDate" | "startTime" | "endTime"> {
  only(
    body,
    previous
      ? [
          "title",
          "notes",
          "categoryId",
          "dueDate",
          "startTime",
          "endTime",
          "isCompleted",
          "isFocusPriority",
        ]
      : ["title", "notes", "categoryId", "dueDate", "startTime", "endTime"],
  );
  const dueDate =
    body.dueDate === undefined
      ? (previous?.dueDate ?? null)
      : body.dueDate === null
        ? null
        : date(body.dueDate, "dueDate");
  const startTime =
    body.startTime === undefined
      ? (previous?.startTime ?? null)
      : time(body.startTime, "startTime");
  const endTime =
    body.endTime === undefined ? (previous?.endTime ?? null) : time(body.endTime, "endTime");
  if ((startTime === null) !== (endTime === null))
    bad("startTime", "Start and end times must both be set");
  if (startTime && (!dueDate || !endTime || endTime <= startTime))
    bad("endTime", "End time must be later on the same due date");
  return {
    title:
      body.title === undefined && previous
        ? previous.title
        : (text(body.title, "title", 160) as string),
    notes:
      body.notes === undefined
        ? (previous?.notes ?? null)
        : optionalText(body.notes, "notes", 2000),
    categoryId:
      body.categoryId === undefined
        ? (previous?.categoryId ?? "other")
        : (text(body.categoryId, "categoryId", 100) as string),
    dueDate,
    startTime,
    endTime,
  };
}

function assertCategory(context: Context, id: string): void {
  if (!context.state.taskCategories.some((item) => item.id === id))
    bad("categoryId", "Unknown task category");
}

export function taskSummary(context: Context): Result {
  const today = context.now.toISOString().slice(0, 10);
  const tasks = context.state.tasks;
  return ok({
    today: tasks.filter((task) => !task.isCompleted && task.dueDate && task.dueDate <= today)
      .length,
    upcoming: tasks.filter((task) => !task.isCompleted && task.dueDate && task.dueDate > today)
      .length,
    completed: tasks.filter((task) => task.isCompleted).length,
    total: tasks.length,
  });
}

export function taskList(context: Context, url: URL): Result {
  const params = query(url, ["view", "q", "categoryId", "limit", "cursor"]);
  const view = params.get("view") ?? "today";
  if (!["today", "upcoming", "completed", "all"].includes(view)) bad("view", "Unknown view");
  const q = params.get("q");
  if (q !== null && (!q.trim() || q.length > 160)) bad("q", "Invalid search");
  const categoryId = params.get("categoryId");
  if (categoryId && !context.state.taskCategories.some((item) => item.id === categoryId))
    bad("categoryId", "Unknown task category");
  const today = context.now.toISOString().slice(0, 10);
  const items = context.state.tasks.filter((task) => {
    if (categoryId && task.categoryId !== categoryId) return false;
    if (q && !`${task.title} ${task.notes ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    if (view === "today") return !task.isCompleted && !!task.dueDate && task.dueDate <= today;
    if (view === "upcoming") return !task.isCompleted && !!task.dueDate && task.dueDate > today;
    if (view === "completed") return task.isCompleted;
    return true;
  });
  items.sort((a, b) => {
    if (view === "completed")
      return (b.completedAt ?? "").localeCompare(a.completedAt ?? "") || a.id.localeCompare(b.id);
    if (view === "all")
      return (
        Number(a.isCompleted) - Number(b.isCompleted) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id)
      );
    return (
      (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
      (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
    );
  });
  const page = parsePage(
    items,
    params,
    `${view}|${q ?? ""}|${categoryId ?? ""}`,
    context.datasetId,
  );
  return ok({ ...page, items: page.items.map(publicTask) });
}

export function taskItem(
  context: Context,
  method: string,
  id: string,
  request: Request,
  body?: Record<string, unknown>,
): Result {
  const task = getById(context.state.tasks, id);
  if (method === "GET") return ok(publicTask(task));
  requireVersion(request, task.version);
  if (method === "DELETE") {
    context.state.tasks = context.state.tasks.filter((item) => item.id !== id);
    return noContent();
  }
  if (method !== "PATCH" || !body) missing();
  const fields = validateFields(body, task);
  assertCategory(context, fields.categoryId);
  Object.assign(task, fields);
  if (body.isCompleted !== undefined) {
    const next = boolean(body.isCompleted, "isCompleted");
    if (next !== task.isCompleted) {
      task.isCompleted = next;
      task.completedAt = next ? context.now.toISOString() : null;
    }
  }
  if (body.isFocusPriority !== undefined)
    task.isFocusPriority = boolean(body.isFocusPriority, "isFocusPriority");
  if (task.isCompleted) task.isFocusPriority = false;
  if (task.isFocusPriority && !task.prioritySelectedAt)
    task.prioritySelectedAt = context.now.toISOString();
  if (!task.isFocusPriority) task.prioritySelectedAt = null;
  if (
    task.isFocusPriority &&
    context.state.tasks.filter((item) => item.isFocusPriority && !item.isCompleted).length > 3
  )
    conflict("FOCUS_PRIORITY_LIMIT", "At most three priority tasks are allowed");
  task.updatedAt = context.now.toISOString();
  task.version++;
  return ok(publicTask(task));
}

export async function createTask(
  context: Context,
  request: Request,
  body: Record<string, unknown>,
): Promise<Result> {
  return idempotent(context, request, "/tasks", body, () => {
    rateLimit(context);
    const fields = validateFields(body);
    assertCategory(context, fields.categoryId);
    if (context.state.tasks.length >= 1000)
      throw new ApiError(429, "RATE_LIMITED", "Task capacity reached until the next reset");
    const now = context.now.toISOString();
    const task: Task = {
      id: randomUUID(),
      ...fields,
      isCompleted: false,
      completedAt: null,
      isFocusPriority: false,
      prioritySelectedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    context.state.tasks.push(task);
    return created(publicTask(task), `/api/minidesk/v1/tasks/${task.id}`);
  });
}

export function priorityTasks(context: Context): Result {
  const items = context.state.tasks
    .filter((task) => task.isFocusPriority && !task.isCompleted)
    .sort(
      (a, b) =>
        (a.prioritySelectedAt ?? "").localeCompare(b.prioritySelectedAt ?? "") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3)
    .map(({ id, title, categoryId, dueDate }) => ({
      id,
      title,
      categoryId,
      dueDate,
      isCompleted: false as const,
    }));
  return ok({ items });
}
