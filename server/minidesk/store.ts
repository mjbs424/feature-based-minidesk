import { randomUUID } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";
import { ApiError } from "./errors.js";
import {
  newState,
  nextReset,
  windowStart,
  type Budget,
  type Category,
  type Expense,
  type FocusSession,
  type IdempotencyRecord,
  type RumEvent,
  type State,
  type Task,
} from "./model.js";

const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 1, prepare: false, idle_timeout: 20 }) : null;
type Tx = TransactionSql;
type Row = Record<string, unknown>;

export type Context = {
  state: State;
  datasetId: string;
  windowStart: string;
  resetAt: string;
  now: Date;
};

const iso = (value: unknown): string => new Date(value as string | Date).toISOString();
const day = (value: unknown): string => iso(value).slice(0, 10);
const clock = (value: unknown): string | null => {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("Unexpected database time value");
  return value.slice(0, 5);
};
const nullableIso = (value: unknown): string | null => (value === null ? null : iso(value));
const changed = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) !== JSON.stringify(right);
const byId = <T>(items: T[], key: (item: T) => string): Map<string, T> =>
  new Map(items.map((item) => [key(item), item]));

async function seedCategories(tx: Tx): Promise<void> {
  const defaults = newState();
  for (const item of defaults.taskCategories)
    await tx`
      INSERT INTO minidesk_task_categories (id, label, is_default)
      VALUES (${item.id}, ${item.label}, true) ON CONFLICT (id) DO NOTHING
    `;
  for (const item of defaults.expenseCategories)
    await tx`
      INSERT INTO minidesk_expense_categories (id, label, is_default)
      VALUES (${item.id}, ${item.label}, true) ON CONFLICT (id) DO NOTHING
    `;
}

async function resetIfNeeded(start: Date): Promise<void> {
  if (!sql) throw new ApiError(503, "DATABASE_UNAVAILABLE", "Database is not configured");
  const current = await sql`SELECT window_start FROM minidesk_generation WHERE id = 1`;
  if (current[0] && new Date(iso(current[0].window_start)) >= start) return;
  await sql.begin(async (tx) => {
    const inserted = await tx`
      INSERT INTO minidesk_generation (id, window_start, dataset_id, write_count)
      VALUES (1, ${start.toISOString()}, ${randomUUID()}, 0)
      ON CONFLICT (id) DO NOTHING RETURNING id
    `;
    const rows = await tx`SELECT window_start FROM minidesk_generation WHERE id = 1 FOR UPDATE`;
    if (new Date(iso(rows[0].window_start)) < start) {
      // The migration ledger and unrelated projects are outside this reset.
      await tx.unsafe(`TRUNCATE TABLE
        minidesk_focus_segments, minidesk_focus_sessions, minidesk_tasks,
        minidesk_expenses, minidesk_budgets, minidesk_rum_events,
        minidesk_task_categories, minidesk_expense_categories,
        minidesk_idempotency, minidesk_write_ticks RESTART IDENTITY`);
      await tx`
        UPDATE minidesk_generation
        SET window_start = ${start.toISOString()}, dataset_id = ${randomUUID()}, write_count = 0
        WHERE id = 1
      `;
      await seedCategories(tx);
    } else if (inserted.length) {
      await seedCategories(tx);
    }
  });
}

async function loadState(tx: Tx, writeCount: number, path: string, method: string): Promise<State> {
  const state = newState();
  const taskArea = path.startsWith("tasks") || path.startsWith("focus/");
  const expenseArea = path.startsWith("expenses") || path.startsWith("budgets/");
  const focusArea = path.startsWith("focus/");
  const taskAreaNeedsActiveFocus = path === "tasks" || path.startsWith("tasks/");
  const taskCategories =
    path.startsWith("task-categories") || path.startsWith("tasks")
      ? await tx`SELECT * FROM minidesk_task_categories`
      : [];
  const expenseCategories =
    path.startsWith("expense-categories") || path.startsWith("expenses")
      ? await tx`SELECT * FROM minidesk_expense_categories`
      : [];
  const tasks = taskArea ? await tx`SELECT * FROM minidesk_tasks` : [];
  const expenses = path.startsWith("expenses") ? await tx`SELECT * FROM minidesk_expenses` : [];
  const budgets = expenseArea ? await tx`SELECT * FROM minidesk_budgets` : [];
  const sessions = focusArea
    ? await tx`SELECT * FROM minidesk_focus_sessions`
    : taskAreaNeedsActiveFocus
      ? await tx`SELECT * FROM minidesk_focus_sessions WHERE status = 'running'`
      : [];
  const segments = focusArea
    ? await tx`SELECT * FROM minidesk_focus_segments ORDER BY session_id, position`
    : taskAreaNeedsActiveFocus
      ? await tx`SELECT s.* FROM minidesk_focus_segments s JOIN minidesk_focus_sessions f ON f.id = s.session_id WHERE f.status = 'running' ORDER BY s.session_id, s.position`
      : [];
  const events = path.startsWith("rum/") ? await tx`SELECT * FROM minidesk_rum_events` : [];
  const usesIdempotency =
    method === "POST" &&
    (path === "task-categories" ||
      path === "expense-categories" ||
      path === "tasks" ||
      path === "expenses" ||
      path === "focus/sessions" ||
      /^focus\/sessions\/[^/]+\/(pause|resume|finish)$/.test(path));
  const keys = usesIdempotency ? await tx`SELECT * FROM minidesk_idempotency` : [];
  const ticks =
    method === "GET" ? [] : await tx`SELECT occurred_at_ms FROM minidesk_write_ticks ORDER BY id`;

  const category = (row: Row): Category => ({
    id: String(row.id),
    label: String(row.label),
    isDefault: Boolean(row.is_default),
  });
  const ordered = (items: Category[], defaults: Category[]): Category[] =>
    items.sort(
      (a, b) =>
        (defaults.findIndex((item) => item.id === a.id) + 1 || 999) -
        (defaults.findIndex((item) => item.id === b.id) + 1 || 999),
    );
  state.taskCategories = ordered(taskCategories.map(category), state.taskCategories);
  state.expenseCategories = ordered(expenseCategories.map(category), state.expenseCategories);
  state.tasks = tasks.map((row): Task => ({
    id: String(row.id),
    title: String(row.title),
    notes: row.notes === null ? null : String(row.notes),
    categoryId: String(row.category_id),
    dueDate: row.due_date === null ? null : day(row.due_date),
    startTime: clock(row.start_time),
    endTime: clock(row.end_time),
    isCompleted: Boolean(row.is_completed),
    completedAt: nullableIso(row.completed_at),
    isFocusPriority: Boolean(row.is_focus_priority),
    prioritySelectedAt: nullableIso(row.priority_selected_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    version: Number(row.version),
  }));
  state.expenses = expenses.map((row): Expense => ({
    id: String(row.id),
    description: String(row.description),
    notes: row.notes === null ? null : String(row.notes),
    amountMinor: Number(row.amount_minor),
    currency: "USD",
    categoryId: String(row.category_id),
    occurredOn: day(row.occurred_on),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    version: Number(row.version),
  }));
  state.budgets = budgets.map((row): Budget => ({
    month: day(row.month).slice(0, 7),
    amountMinor: Number(row.amount_minor),
    currency: "USD",
    updatedAt: iso(row.updated_at),
    version: Number(row.version),
  }));
  const segmentsBySession = new Map<string, FocusSession["segments"]>();
  for (const segment of segments) {
    const id = String(segment.session_id);
    const items = segmentsBySession.get(id) ?? [];
    items.push({ start: iso(segment.started_at), end: nullableIso(segment.ended_at) });
    segmentsBySession.set(id, items);
  }
  state.focusSessions = sessions.map((row): FocusSession => ({
    id: String(row.id),
    status: row.status as FocusSession["status"],
    taskId: row.task_id === null ? null : String(row.task_id),
    taskTitle: row.task_title === null ? null : String(row.task_title),
    completeTaskOnTarget: Boolean(row.complete_task_on_target),
    taskCompletionApplied: Boolean(row.task_completion_applied),
    startedAt: iso(row.started_at),
    endedAt: nullableIso(row.ended_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    version: Number(row.version),
    segments: segmentsBySession.get(String(row.id)) ?? [],
  }));
  state.rumEvents = events.map((row): RumEvent => ({
    eventId: String(row.event_id),
    kind: row.kind as RumEvent["kind"],
    route: String(row.route),
    occurredAt: iso(row.occurred_at),
    ...(row.metric === null ? {} : { metric: row.metric as RumEvent["metric"] }),
    ...(row.value === null ? {} : { value: Number(row.value) }),
  }));
  state.idempotency = Object.fromEntries(
    keys.map((row) => [
      String(row.scoped_key),
      {
        signature: String(row.signature),
        status: Number(row.status),
        body: row.body,
        ...(row.location === null ? {} : { location: String(row.location) }),
      } satisfies IdempotencyRecord,
    ]),
  );
  state.writeTicks = ticks.map((row) => Number(row.occurred_at_ms));
  state.writeCount = writeCount;
  return state;
}

async function persistState(tx: Tx, before: State, after: State): Promise<void> {
  for (const item of after.taskCategories)
    if (!before.taskCategories.some((old) => old.id === item.id))
      await tx`
        INSERT INTO minidesk_task_categories (id, label, is_default)
        VALUES (${item.id}, ${item.label}, ${item.isDefault})
      `;
  for (const item of after.expenseCategories)
    if (!before.expenseCategories.some((old) => old.id === item.id))
      await tx`
        INSERT INTO minidesk_expense_categories (id, label, is_default)
        VALUES (${item.id}, ${item.label}, ${item.isDefault})
      `;

  const oldTasks = byId(before.tasks, (item) => item.id);
  for (const item of after.tasks) {
    if (!changed(oldTasks.get(item.id), item)) continue;
    await tx`
      INSERT INTO minidesk_tasks (
        id, title, notes, category_id, due_date, start_time, end_time,
        is_completed, completed_at, is_focus_priority, priority_selected_at,
        created_at, updated_at, version
      ) VALUES (
        ${item.id}, ${item.title}, ${item.notes}, ${item.categoryId}, ${item.dueDate},
        ${item.startTime}, ${item.endTime}, ${item.isCompleted}, ${item.completedAt},
        ${item.isFocusPriority}, ${item.prioritySelectedAt}, ${item.createdAt},
        ${item.updatedAt}, ${item.version}
      ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, notes = EXCLUDED.notes, category_id = EXCLUDED.category_id,
        due_date = EXCLUDED.due_date, start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time, is_completed = EXCLUDED.is_completed,
        completed_at = EXCLUDED.completed_at, is_focus_priority = EXCLUDED.is_focus_priority,
        priority_selected_at = EXCLUDED.priority_selected_at,
        updated_at = EXCLUDED.updated_at, version = EXCLUDED.version
    `;
  }
  const oldExpenses = byId(before.expenses, (item) => item.id);
  for (const item of after.expenses) {
    if (!changed(oldExpenses.get(item.id), item)) continue;
    await tx`
      INSERT INTO minidesk_expenses (
        id, description, notes, amount_minor, currency, category_id, occurred_on,
        created_at, updated_at, version
      ) VALUES (
        ${item.id}, ${item.description}, ${item.notes}, ${item.amountMinor},
        ${item.currency}, ${item.categoryId}, ${item.occurredOn},
        ${item.createdAt}, ${item.updatedAt}, ${item.version}
      ) ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description, notes = EXCLUDED.notes,
        amount_minor = EXCLUDED.amount_minor, category_id = EXCLUDED.category_id,
        occurred_on = EXCLUDED.occurred_on, updated_at = EXCLUDED.updated_at,
        version = EXCLUDED.version
    `;
  }
  const oldBudgets = byId(before.budgets, (item) => item.month);
  for (const item of after.budgets) {
    if (!changed(oldBudgets.get(item.month), item)) continue;
    await tx`
      INSERT INTO minidesk_budgets (month, amount_minor, currency, updated_at, version)
      VALUES (${item.month + "-01"}, ${item.amountMinor}, ${item.currency},
        ${item.updatedAt}, ${item.version})
      ON CONFLICT (month) DO UPDATE SET
        amount_minor = EXCLUDED.amount_minor, updated_at = EXCLUDED.updated_at,
        version = EXCLUDED.version
    `;
  }
  const oldSessions = byId(before.focusSessions, (item) => item.id);
  for (const item of after.focusSessions) {
    if (!changed(oldSessions.get(item.id), item)) continue;
    await tx`
      INSERT INTO minidesk_focus_sessions (
        id, status, task_id, task_title, complete_task_on_target,
        task_completion_applied, started_at, ended_at, created_at, updated_at, version
      ) VALUES (
        ${item.id}, ${item.status}, ${item.taskId}, ${item.taskTitle},
        ${item.completeTaskOnTarget}, ${item.taskCompletionApplied},
        ${item.startedAt}, ${item.endedAt}, ${item.createdAt}, ${item.updatedAt},
        ${item.version}
      ) ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, task_id = EXCLUDED.task_id,
        task_title = EXCLUDED.task_title,
        complete_task_on_target = EXCLUDED.complete_task_on_target,
        task_completion_applied = EXCLUDED.task_completion_applied,
        ended_at = EXCLUDED.ended_at, updated_at = EXCLUDED.updated_at,
        version = EXCLUDED.version
    `;
    await tx`DELETE FROM minidesk_focus_segments WHERE session_id = ${item.id}`;
    for (const [position, segment] of item.segments.entries())
      await tx`
        INSERT INTO minidesk_focus_segments (session_id, position, started_at, ended_at)
        VALUES (${item.id}, ${position}, ${segment.start}, ${segment.end})
      `;
  }
  const oldEvents = new Set(before.rumEvents.map((item) => item.eventId));
  for (const item of after.rumEvents) {
    if (oldEvents.has(item.eventId)) continue;
    await tx`
      INSERT INTO minidesk_rum_events (event_id, kind, route, occurred_at, metric, value)
      VALUES (${item.eventId}, ${item.kind}, ${item.route}, ${item.occurredAt},
        ${item.metric ?? null}, ${item.value ?? null})
    `;
  }
  for (const [key, item] of Object.entries(after.idempotency)) {
    if (!changed(before.idempotency[key], item)) continue;
    await tx`
      INSERT INTO minidesk_idempotency (scoped_key, signature, status, body, location)
      VALUES (${key}, ${item.signature}, ${item.status},
        ${item.body === undefined ? null : tx.json(item.body)}, ${item.location ?? null})
      ON CONFLICT (scoped_key) DO UPDATE SET
        signature = EXCLUDED.signature, status = EXCLUDED.status,
        body = EXCLUDED.body, location = EXCLUDED.location
    `;
  }
  const afterSessions = new Set(after.focusSessions.map((item) => item.id));
  for (const item of before.focusSessions)
    if (!afterSessions.has(item.id))
      await tx`DELETE FROM minidesk_focus_sessions WHERE id = ${item.id}`;
  const afterTasks = new Set(after.tasks.map((item) => item.id));
  for (const item of before.tasks)
    if (!afterTasks.has(item.id)) await tx`DELETE FROM minidesk_tasks WHERE id = ${item.id}`;
  const afterExpenses = new Set(after.expenses.map((item) => item.id));
  for (const item of before.expenses)
    if (!afterExpenses.has(item.id)) await tx`DELETE FROM minidesk_expenses WHERE id = ${item.id}`;
  if (changed(before.writeTicks, after.writeTicks)) {
    await tx`DELETE FROM minidesk_write_ticks`;
    for (const tick of after.writeTicks)
      await tx`INSERT INTO minidesk_write_ticks (occurred_at_ms) VALUES (${tick})`;
  }
  if (before.writeCount !== after.writeCount)
    await tx`UPDATE minidesk_generation SET write_count = ${after.writeCount} WHERE id = 1`;
}

export async function withState<T>(
  path: string,
  method: string,
  run: (context: Context) => Promise<T> | T,
): Promise<T> {
  if (!sql) throw new ApiError(503, "DATABASE_UNAVAILABLE", "Database is not configured");
  const now = new Date();
  const start = windowStart(now);
  // Commit the reset before rejecting a stale write, so DATASET_RESET cannot roll it back.
  await resetIfNeeded(start);
  return sql.begin(async (tx) => {
    const canChangeState =
      method !== "GET" ||
      path.startsWith("focus/") ||
      path === "tasks" ||
      path.startsWith("tasks/");
    const rows = canChangeState
      ? await tx`SELECT window_start, dataset_id, write_count FROM minidesk_generation WHERE id = 1 FOR UPDATE`
      : await tx`SELECT window_start, dataset_id, write_count FROM minidesk_generation WHERE id = 1 FOR SHARE`;
    const row = rows[0];
    const state = await loadState(tx, Number(row.write_count), path, method);
    const before = canChangeState ? structuredClone(state) : null;
    const result = await run({
      state,
      datasetId: String(row.dataset_id),
      windowStart: iso(row.window_start),
      resetAt: nextReset(new Date(iso(row.window_start))),
      now,
    });
    if (before) await persistState(tx, before, state);
    return result;
  });
}
