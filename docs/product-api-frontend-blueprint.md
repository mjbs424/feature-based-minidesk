# MiniDesk product rules and API planning contract

**Status:** Approved product behavior and preliminary HTTP contract, 2026-11-26. T06/OpenAPI will own the formal frontend-facing API contract. This document records the agreed behavior and data needs until each feature has its own Spec Kit spec.

## 1. Scope and document ownership

MiniDesk has four frontend routes: `/`, `/expenses`, `/focus`, and `/real-user-monitoring`. The pages are still placeholders; feature specs have not yet been written. Product behavior here is input to those specs. Project phases and task IDs belong to [feature-delivery.md](feature-delivery.md); feature journeys, plans, and executable tasks belong in `specs/<feature>/`; the eventual frontend data contract belongs to T06/OpenAPI. The frontend's HTTP boundary is described in [api.md](api.md). Backend operation and deployment belong to [backend.md](backend.md).

The images in `public/` guide the simple To-do, Expenses, and Focus layouts; their example data and decorative controls do not define behavior. Monitoring has no reference image.

### Project and data boundary

MiniDesk's public, unauthenticated routes are under **`/api/minidesk/v1/`**. All visitors share one temporary dataset. Frontend features consume only HTTP and do not import server code, database models, or credentials, even while the demo service is colocated in this repository.

The 12-hour reset affects only MiniDesk's records; other projects' data is outside this contract. Built-in MiniDesk categories reappear after every reset. Storage and migration details are in [backend.md](backend.md).

### Small public demo

| Feature    | Included                                                        | Deferred                                                  |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| To-do      | Task CRUD, completion, due date/time, search/filter, categories | Subtasks, reminders, recurrence, drag ordering            |
| Expenses   | Dollar spending, temporary monthly budget, category totals      | Banking, income, refunds, recurrence, multiple currencies |
| Focus      | Shared 25-minute timer, optional linked task, history           | Timer presets, sound, streaks, daily goals                |
| Monitoring | Aggregate page views and site-performance metrics               | Personal analytics, session replay, device fingerprinting |

Illustrative image controls do not add requirements. Expense rows have no completion state.

## 2. Confirmed product rules

The agreed reset interval is **12 hours**. “General” time is interpreted as **UTC**. A change to either rule requires an API contract update.

| ID  | Rule                                                                                                                                                                                                    | Contract consequence                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | MiniDesk has no authentication, accounts, or user-specific storage. Every visitor sees and edits the same public MiniDesk dataset.                                                                      | Only MiniDesk's `/api/minidesk/v1/` routes are public by this decision; it says nothing about future project routes.                                                   |
| D2  | All money is US dollars (`$`). The API stores integer cents and returns `USD`; the UI displays `$`.                                                                                                     | No currency chooser, conversion, or currency-setting endpoint.                                                                                                         |
| D3  | Use UTC for calendar dates, “today,” month boundaries, reset schedule, and timestamps.                                                                                                                  | Dates are consistent across visitors. The browser must not silently regroup them in local time.                                                                        |
| D4  | The named task and expense categories are built in and reappear after every reset. Visitors can add more categories in the UI.                                                                          | Separate category lists and create endpoints; custom categories are temporary.                                                                                         |
| D5  | Deletion is permanent; no soft delete or recovery UI.                                                                                                                                                   | A deleted task may leave a plain title snapshot in an already completed focus session.                                                                                 |
| D6  | One shared active 25-minute focus session at a time. A linked task has an optional checkbox to mark it complete when the full timer finishes.                                                           | The checkbox defaults off; early manual finish does not mark the task complete.                                                                                        |
| D7  | Collect only simple, non-personal page-view and site-performance data, without a consent prompt in this demo.                                                                                           | No user, session, or device identifiers in analytics payloads; no personal-content fields.                                                                             |
| D8  | MiniDesk generations expire at **00:00 and 12:00 UTC**. Before serving the first MiniDesk request in a new generation, reset **MiniDesk-owned tables only** and restore MiniDesk's built-in categories. | No other project's tables, records, or defaults are touched. No expired MiniDesk data can be read or written; an active timer is interrupted. A scheduler is optional. |

## 3. MiniDesk HTTP contract shared by the features

The backend handoff uses the **`/api/minidesk/v1/`** JSON API with **no authentication or account context for MiniDesk**. The frontend uses a same-origin relative API base in the approved Vercel deployment, but the frontend API boundary must also support a different origin later without importing server code. The formal OpenAPI source and generation workflow remain T06 decisions. This is a shared public demo: any visitor can change or remove MiniDesk data created by another visitor. Do not use this API for private or important data. Bound request size and rate-limit public writes and telemetry ingestion so the demo remains usable. Public access is scoped to the MiniDesk routes, not implicitly to any future project.

- Request/response media type: `application/json`; UTF-8. Do not use floating-point numbers for money.
- IDs: opaque strings; clients must not parse them. All timestamps: RFC 3339 UTC strings such as `2026-11-26T10:00:00Z`. Calendar dates: `YYYY-MM-DD` in UTC; times: `HH:mm` in 24-hour UTC time.
- Server owns `id`, `createdAt`, `updatedAt`, calculated summaries, and focus elapsed time. Unknown write fields are rejected. `PATCH` changes only supplied fields; explicit `null` clears a nullable field.
- Successful `GET` returns the documented resource directly. `POST` returns `201` plus the created resource and `Location`; `PATCH`/`PUT`/action `POST` returns the updated resource; `DELETE` returns `204`. No synthetic success envelope.
- List response: `{ "items": [...], "nextCursor": string | null }`. Stable sort is specified per list; `limit` defaults to 20, maximum 100. A cursor is opaque and scoped to the exact filter/sort. Invalid or expired cursors return `400`.
- Error response: `{ "error": { "code": string, "message": string, "fields"?: { [field: string]: string } } }`. Required codes: `VALIDATION_ERROR` (`400`/`422`), `NOT_FOUND` (`404`), `CONFLICT` (`409`), `RATE_LIMITED` (`429`), `INTERNAL_ERROR` (`500`). Error text must not echo arbitrary stored content. A resource cleared by the reset returns `404`.
- Every MiniDesk state-changing request sends `X-Minidesk-Dataset-Id` from `/api/minidesk/v1/demo`. If a MiniDesk reset happened since the page loaded, return `409` with `DATASET_RESET` and do not write into the new generation. The frontend refetches `/api/minidesk/v1/demo` and the active page.
- Mutation requests should accept an `Idempotency-Key` header for create and focus action calls, scoped to the current dataset generation, route, and body until the next reset. Repeating a key with a different body returns `409`. This prevents duplicate entries after retries without retaining keys beyond the reset.
- Resource updates use `version: integer` in the response and `If-Match: "<version>"` on `PATCH`/`PUT`/`DELETE`; stale writes return `409` with `CONFLICT`. The frontend then refreshes and shows a conflict message.
- Server validates lengths, category membership, dates, amount bounds, and state transitions. All collection endpoints have rate limits; exact thresholds are operational choices.

### Demo clock and reset context

`GET /api/minidesk/v1/demo` returns the shared clock and current dataset generation:

```json
{
  "datasetId": "opaque-generation-id",
  "timeZone": "UTC",
  "currency": "USD",
  "serverNow": "2026-11-26T10:00:00Z",
  "resetAt": "2026-11-26T12:00:00Z"
}
```

Every MiniDesk request first compares the persisted MiniDesk generation with the current 12-hour UTC window. If the window changed, one transaction creates a new **MiniDesk** `datasetId`, clears only MiniDesk-owned mutable records and aggregate counters, and restores MiniDesk's built-in categories before the request continues. Serialize concurrent first requests so the reset runs once and no expired data is returned or accepted. There are no sample tasks or expenses inserted after reset. The reset must never perform a database-wide flush, drop shared tables, or operate on another project's rows. A scheduler may trigger the same MiniDesk reset proactively if the deployment supports it, but correctness must not depend on a scheduler. If a reset is retried, it remains safe and leaves exactly one set of built-in categories for the current generation. `serverNow` aligns the countdown and UTC date labels. The frontend detects a changed `datasetId` on refetch, clears cached feature data and open editing state, and tells the visitor that MiniDesk has reset. A stale resource ID returns `404`. Public MiniDesk API responses should use `Cache-Control: no-store` so visitors do not see an old generation.

### Categories shared by their own feature

Task categories and expense categories are separate lists. Built-in categories have stable IDs (`work`, `personal`, `errands`, `travel`, `other` for tasks; `groceries`, `bills`, `transport`, `food`, `other` for expenses). Custom categories receive opaque IDs and disappear at the next reset. A custom category has a plain-text label of 1–40 characters; trim whitespace and reject duplicate labels case-insensitively within that feature. Limit each feature to 20 custom categories per generation. For this small demo there is no category edit/delete UI. Built-in labels/icons use the supplied visual direction; a custom category uses a generic icon and semantic color.

```ts
type Category = {
  id: string;
  label: string;
  isDefault: boolean;
};
```

| Endpoint                                   | Input                 | Output                                                                                                 |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/minidesk/v1/task-categories`     | None                  | `{ "items": Category[] }`, built-ins first in the listed order, then custom categories alphabetically. |
| `POST /api/minidesk/v1/task-categories`    | `{ "label": string }` | Created `Category`; duplicate label or capacity limit returns `409`.                                   |
| `GET /api/minidesk/v1/expense-categories`  | None                  | Same list shape, scoped to expense categories.                                                         |
| `POST /api/minidesk/v1/expense-categories` | `{ "label": string }` | Created expense `Category`; same validation.                                                           |

## 4. To-do — `/`

### User journey and screen

The page shows a title, progress summary, Today and Upcoming sections on desktop, and compact Today/Upcoming/Completed/All quick views on mobile. Each row shows title, optional category, optional due date/time, completion state, and a menu for edit/delete. A single Add task action opens a short form. Search and a view filter are scoped to tasks. Selecting a quick view changes the visible list without a new route. Keyboard users can reach every action; completion and menu controls have names. Mobile rows stack metadata under the title.

Task creation requires a title (1–160 characters). Optional notes are plain text (maximum 2,000 characters), category defaults to the built-in `other`, due date is nullable, and optional start/end times are either both present or both absent and require a due date. End time must be later than start time on the same UTC day. No overdue section in the first release: incomplete tasks with a due date before the current UTC date appear in Today, labeled overdue. Upcoming contains incomplete tasks dated after today. Undated incomplete tasks appear in All. Completed is a separate view. Changing completion sets or clears `completedAt` on the server. A completed task stays in All and Completed, but leaves Today/Upcoming. Delete requires a confirmation and permanently removes the task.

### Data shape

```ts
type Task = {
  id: string;
  title: string;
  notes: string | null;
  categoryId: string; // ID from /api/minidesk/v1/task-categories
  dueDate: string | null; // YYYY-MM-DD in UTC
  startTime: string | null; // HH:mm UTC; both times or neither
  endTime: string | null;
  isCompleted: boolean;
  completedAt: string | null; // UTC instant
  isFocusPriority: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};
```

`isFocusPriority` selects up to three incomplete tasks for Focus. A task may be selected or removed from that set through the normal task update; completing a task automatically clears its focus priority. Attempts to select a fourth task return `409` with `FOCUS_PRIORITY_LIMIT`.

### Endpoints and exact returned data

| Endpoint                                 | Input                                                                                                                                                                   | Output and semantics                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/minidesk/v1/tasks`             | Query: `view=today \| upcoming \| completed \| all` (default `today`); optional `q` (1–160 chars, case-insensitive title/notes search), `categoryId`, `limit`, `cursor` | `items: Task[]`, `nextCursor`. Today: incomplete tasks due today or earlier; Upcoming: incomplete with later due date; Completed: completed, newest completion first; All: all tasks, incomplete first. Today/Upcoming order by due date, start time, then creation; All by `updatedAt` descending. Search applies before pagination. |
| `GET /api/minidesk/v1/tasks/summary`     | No input                                                                                                                                                                | `{ "today": number, "upcoming": number, "completed": number, "total": number }`. Counts use the same definitions as `GET /api/minidesk/v1/tasks`, but ignore current search/category filters. `total` includes all current tasks. Progress is `completed / total`, or 0 when total is 0.                                              |
| `POST /api/minidesk/v1/tasks`            | `{ "title": string, "notes"?: string \| null, "categoryId"?: string, "dueDate"?: string \| null, "startTime"?: string \| null, "endTime"?: string \| null }`            | Created `Task`; defaults: `notes/dueDate/startTime/endTime=null`, `categoryId=other`, `isCompleted=false`, `isFocusPriority=false`. Category ID must exist in the current generation.                                                                                                                                                 |
| `GET /api/minidesk/v1/tasks/{taskId}`    | Path ID                                                                                                                                                                 | `Task`; used by edit/detail state and refresh.                                                                                                                                                                                                                                                                                        |
| `PATCH /api/minidesk/v1/tasks/{taskId}`  | Any writable create field plus optional `isCompleted: boolean`, `isFocusPriority: boolean`; `If-Match`                                                                  | Updated `Task`. Completion timestamp is set/cleared atomically.                                                                                                                                                                                                                                                                       |
| `DELETE /api/minidesk/v1/tasks/{taskId}` | `If-Match`                                                                                                                                                              | `204`; future task reads return `404`; historical focus sessions retain their snapshot.                                                                                                                                                                                                                                               |

Empty results return zero counts and `items: []`. A failed write preserves the form and reports the error. Crossing 00:00 UTC requires refetching Today/Upcoming and the summary. A reset clears all tasks and custom categories; an open task form must refresh its category options.

## 5. Expenses — `/expenses`

### User journey and screen

The page shows the current UTC month's spending against a simple monthly budget, a short list of this month's entries, recent entries, and a category breakdown. On mobile, compact quick views link to This month, Categories, and All expenses; the recurring tile in the reference is replaced with a budget tile because recurrence is deferred. Add expense opens a form for description, dollar amount, category, and UTC occurrence date; edit and permanent delete are available from each row. Search is scoped to descriptions and notes. Expense rows show a signed display amount (spending shown as a minus in the mobile reference), but the stored amount is always positive. There is no expense completion checkbox.

An expense has a description (1–160 characters), integer `amountMinor` in US cents greater than zero and at most 999999999, category ID, UTC calendar date, and optional plain-text notes (maximum 2,000 characters). Only spending is modeled. The currency is always `USD`; a currency field in a write is rejected. The backend stores **one budget per UTC calendar month** among the current demo records and returns `null` when one is absent. Because all records reset every 12 hours, this is only a short-lived comparison, not long-term monthly tracking. A zero budget is allowed and displays no percentage.

### Data shapes and aggregation

```ts
type Expense = {
  id: string;
  description: string;
  notes: string | null;
  amountMinor: number; // positive integer, US cents
  currency: "USD";
  categoryId: string; // ID from /api/minidesk/v1/expense-categories
  occurredOn: string; // YYYY-MM-DD in UTC
  createdAt: string;
  updatedAt: string;
  version: number;
};
type MonthlyBudget = {
  month: string; // YYYY-MM
  amountMinor: number; // nonnegative integer
  currency: "USD";
  updatedAt: string;
  version: number;
};
```

Monthly spending is the sum of non-deleted expenses whose `occurredOn` is in that calendar month; it never depends on creation time. Category totals partition that same sum. `percentOfBudget` is `null` if budget is missing or zero; otherwise return an integer rounded to the nearest whole percent, which may exceed 100. `percentOfSpending` uses the same rounding rule and is `0` for an empty month; totals in minor units remain authoritative when rounded percentages do not add to 100.

### Endpoints and exact returned data

| Endpoint                                       | Input                                                                                                                           | Output and semantics                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/minidesk/v1/expenses`                | Query: optional `month=YYYY-MM`, `q`, `categoryId`, `limit`, `cursor`; absent `month` means all dates in the current generation | `{ items: Expense[], nextCursor }`, sorted by `occurredOn` descending, then `createdAt` descending, then ID. Search is case-insensitive over description/notes.                                                                                                                                                                       |
| `POST /api/minidesk/v1/expenses`               | `{ "description": string, "notes"?: string \| null, "amountMinor": integer, "categoryId": string, "occurredOn": "YYYY-MM-DD" }` | Created `Expense`; `currency=USD`. Category ID must exist in the current generation.                                                                                                                                                                                                                                                  |
| `GET /api/minidesk/v1/expenses/{expenseId}`    | Path ID                                                                                                                         | `Expense`.                                                                                                                                                                                                                                                                                                                            |
| `PATCH /api/minidesk/v1/expenses/{expenseId}`  | Any writable create field; `If-Match`                                                                                           | Updated `Expense`; summaries reflect the new amount/date/category.                                                                                                                                                                                                                                                                    |
| `DELETE /api/minidesk/v1/expenses/{expenseId}` | `If-Match`                                                                                                                      | `204`; summaries exclude the deleted entry.                                                                                                                                                                                                                                                                                           |
| `GET /api/minidesk/v1/expenses/summary`        | `month=YYYY-MM` required                                                                                                        | `{ "month": string, "currency": string, "expenseCount": number, "spentMinor": number, "budgetMinor": number \| null, "remainingMinor": number \| null, "percentOfBudget": number \| null }`. `remainingMinor = budgetMinor - spentMinor`; negative means over budget.                                                                 |
| `GET /api/minidesk/v1/expenses/categories`     | `month=YYYY-MM` required                                                                                                        | `{ "month": string, "currency": "USD", "spentMinor": number, "items": [{ "categoryId": string, "amountMinor": number, "expenseCount": number, "percentOfSpending": number }] }`. Include only categories with expenses, sorted by amount descending then category ID. The UI joins labels from `/api/minidesk/v1/expense-categories`. |
| `GET /api/minidesk/v1/budgets/{month}`         | `month=YYYY-MM` path                                                                                                            | `MonthlyBudget` or `404` when not set. The summary still works without one.                                                                                                                                                                                                                                                           |
| `PUT /api/minidesk/v1/budgets/{month}`         | `{ "amountMinor": integer >= 0 }`; `If-Match` when replacing an existing budget                                                 | Created or updated `MonthlyBudget`; `201` on first creation, `200` on update.                                                                                                                                                                                                                                                         |

The expense page can load its list, summary, and categories independently. If a budget is missing, it offers Set budget, not a fabricated zero-dollar target. If a mutation fails, current entries and typed form values remain visible. At reset, all expenses, budget records, and custom category options disappear together.

## 6. Focus — `/focus`

### User journey and screen

The page shows a 25:00 timer, up to three priority tasks selected from To-do, today's focused time, and recent sessions. Start creates a session; Pause freezes elapsed time; Resume continues; Finish stores a shorter completed session; Discard removes an unwanted active session from totals and history. At 25 minutes the session completes automatically. There is only one **shared** active session (`running` or `paused`) in the demo; visitors in another tab or browser see and can affect the same timer. Reloading reads server state. The frontend renders a smooth local countdown using the server response and `serverNow`, but the backend is authoritative.

The linked task is optional. When one is selected before Start, the form shows **Mark this task complete when 25 minutes finish**, unchecked by default. If checked, only reaching the full 25-minute target completes the task; manual early Finish and Discard do not. The choice is fixed when the session starts. If the task has already been completed or deleted by another visitor at target time, the focus session still completes and reports that no task update was applied. The image's preset menu, sound button, settings button, streak, and daily goal are deferred. Priority task selection can be done from the To-do row menu or the Focus page; both change `Task.isFocusPriority` through the To-do API. Focus displays task data through a Focus-specific endpoint so the feature does not import To-do code. A deleted task remains a title snapshot in completed history.

### Session data and timing rules

```ts
type FocusSession = {
  id: string;
  status: "running" | "paused" | "completed";
  targetSeconds: 1500;
  elapsedSeconds: number; // authoritative whole seconds, 0..1500
  remainingSeconds: number; // targetSeconds - elapsedSeconds
  taskId: string | null; // may reference a subsequently deleted task
  taskTitle: string | null; // snapshot at start
  completeTaskOnTarget: boolean;
  taskCompletionApplied: boolean;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  serverNow: string;
};
```

Elapsed time is the sum of running segments, floored to whole seconds and capped at 1500. Paused intervals count as zero. `Finish` with at least 1 second creates a completed history entry with actual elapsed seconds; finishing at 0 seconds is a `409`. A session that reaches 1500 seconds is completed at the exact target instant, even if reconciliation happens on the next read or background job. At target completion, the server atomically applies the opted-in task update if the task still exists and is incomplete, and sets `taskCompletionApplied` accordingly. Discard returns `204` and excludes the session from history and summaries. Focused time for a UTC day is allocated by actual running seconds within that day's boundaries. Summary totals use completed sessions in the current 12-hour dataset only; a running session is shown separately and not included until completion. The server must make pause/resume/finish transitions atomic and reject invalid transitions with `409`. A scheduled demo reset discards any active session and its history.

### Endpoints and exact returned data

| Endpoint                                           | Input                                                                                    | Output and semantics                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/minidesk/v1/focus/active`                | No input                                                                                 | `{ "session": FocusSession \| null, "serverNow": string }`; only running/paused sessions are active. A target-reached session is reconciled to completed before responding.                                                                                                                                                                              |
| `GET /api/minidesk/v1/focus/priority-tasks`        | No input                                                                                 | `{ "items": [{ "id": string, "title": string, "categoryId": string, "dueDate": string \| null, "isCompleted": false }] }`; at most three, ordered by priority selection time. The backend owns this projection.                                                                                                                                          |
| `POST /api/minidesk/v1/focus/sessions`             | `{ "taskId"?: string \| null, "completeTaskOnTarget"?: boolean }` plus `Idempotency-Key` | New `FocusSession` with `status=running`, `targetSeconds=1500`, `elapsedSeconds=0`; completion option defaults to `false` and requires a non-null `taskId` when true. If another active session exists, return `409` with `ACTIVE_SESSION_EXISTS`; the frontend refetches `/api/minidesk/v1/focus/active`. Referenced task must exist and be incomplete. |
| `POST /api/minidesk/v1/focus/sessions/{id}/pause`  | `If-Match`, `Idempotency-Key`                                                            | Updated paused `FocusSession`; valid only from running.                                                                                                                                                                                                                                                                                                  |
| `POST /api/minidesk/v1/focus/sessions/{id}/resume` | `If-Match`, `Idempotency-Key`                                                            | Updated running `FocusSession`; valid only from paused.                                                                                                                                                                                                                                                                                                  |
| `POST /api/minidesk/v1/focus/sessions/{id}/finish` | `If-Match`, `Idempotency-Key`                                                            | Completed `FocusSession`, with actual `endedAt` and elapsed seconds. Valid from running or paused; if the target was already reached, return the completed session.                                                                                                                                                                                      |
| `DELETE /api/minidesk/v1/focus/sessions/{id}`      | `If-Match`                                                                               | `204`; only an active session can be discarded. Completed history is immutable in the first release.                                                                                                                                                                                                                                                     |
| `GET /api/minidesk/v1/focus/sessions`              | Query: optional `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `limit`, `cursor`                    | Completed `FocusSession[]` and `nextCursor`, sorted by `endedAt` descending. Date bounds are inclusive UTC dates; history contains only this dataset generation.                                                                                                                                                                                         |
| `GET /api/minidesk/v1/focus/summary`               | Query: `date=YYYY-MM-DD` required                                                        | `{ "date": string, "focusedSeconds": number, "completedSessionCount": number, "generationFocusedSeconds": number }`. Day values include completed sessions' running seconds that fall on that UTC date; generation total is the sum of completed sessions since the last reset.                                                                          |

The UI has idle, running, paused, completing, and error states. On a network error during an action, it refetches `/active` before offering the action again. It does not manufacture a second session after a timeout. At midnight UTC, reset, or after returning from a background tab, it refreshes the active session and today's summary.

## 7. Real-user monitoring — `/real-user-monitoring`

### Purpose and proposed small screen

This page answers three questions about the current demo window: how many page views reached the app, which of the four routes were viewed, and what site-performance samples were recorded. It uses the same shell, title, summary cards, a simple per-route table, and an hourly view trend since the last reset; no new visual system is needed. Show the window start and next reset, sample counts, and an honest no-data state. Do not label page views as unique people. The dashboard is public like the rest of the demo.

Collection is automatic for this demo, without a consent prompt as requested. The payload contains no personal identifier or content from tasks or expenses. This describes the product behavior; it does not assert a legal conclusion about notice requirements. The dashboard never exposes raw events and loses all aggregates at the next 12-hour reset.

### Proposed event ingestion

`POST /api/minidesk/v1/rum/events` accepts a batch with 1–20 events from the deployed app. It is public, so it needs bounded bodies and rate limits; counts can be manipulated by arbitrary clients and should be presented as demo telemetry, not trusted audit data. The payload must not contain user IDs, task/expense data, full URLs, query strings, referrers, IP addresses, user-agent strings, or persistent device IDs. The server should not add such fields to stored events or application logs. Infrastructure logging needs separate review when deployed.

```ts
type RumEvent =
  | {
      eventId: string; // random UUID for deduplication, not identity
      kind: "page_view";
      route: "/" | "/expenses" | "/focus" | "/real-user-monitoring";
      occurredAt: string;
    }
  | {
      eventId: string;
      kind: "web_vital";
      route: "/" | "/expenses" | "/focus" | "/real-user-monitoring";
      metric: "LCP" | "INP" | "CLS";
      value: number; // LCP/INP milliseconds; CLS unitless
      occurredAt: string;
    };
type RumBatch = { events: RumEvent[] };
```

The server validates route/metric, bounded ranges (`LCP` 0–60000 ms, `INP` 0–10000 ms, `CLS` 0–10), body size, and duplicate event IDs within the current generation. It accepts only events with `occurredAt` between the current window start and `serverNow` plus five minutes; delayed events from a prior generation are rejected. It returns `202` with `{ "accepted": number, "rejected": number }`; invalid batch shape returns `400`, and mixed batches report counts without echoing raw events. Page views count route visits, not distinct people. A client-side route transition produces one view; repeated re-renders do not. Performance samples may be absent. The backend needs only the current generation's aggregate counts and samples required for percentile calculation; all are cleared at reset.

### Dashboard API

| Endpoint                            | Input               | Output and semantics                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/minidesk/v1/rum/events`  | `RumBatch` as above | `202` acceptance counts; no cookies or user/session identity.                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/minidesk/v1/rum/overview` | None; public        | `{ "windowStart": string, "resetAt": string, "timeZone": "UTC", "pageViews": number, "hourly": [{ "hourStart": string, "pageViews": number }], "routes": [{ "route": string, "pageViews": number }], "vitals": [{ "metric": "LCP" \| "INP" \| "CLS", "sampleCount": number, "p75": number \| null }] }`. Include each elapsed UTC hour bucket and all four routes, even with zero views. `p75=null` when sample count is zero. |

P75 is the nearest-rank 75th percentile over valid samples in the current 12-hour generation; return the original units. The page labels sample count, because low volume makes percentiles unstable. Do not show browser/device breakdowns, unique visitors, or conversion funnels.

## Document handoff

Use the rules and provisional endpoint/data shapes above as planning input. [feature-delivery.md](feature-delivery.md) owns the project phases and task IDs. Each approved feature's Spec Kit `spec.md`, `plan.md`, and `tasks.md` will own its behavior, implementation plan, and work sequence. T06/OpenAPI will establish the formal frontend-facing HTTP contract; frontend code will consume that artifact through the boundary in [api.md](api.md). Backend operation and deployment are documented separately in [backend.md](backend.md).
