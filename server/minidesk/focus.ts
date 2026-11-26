import { randomUUID } from "node:crypto";
import {
  getById,
  idempotent,
  noContent,
  ok,
  only,
  parsePage,
  query,
  requireVersion,
  type Result,
} from "./http.js";
import { ApiError, bad, conflict } from "./errors.js";
import type { FocusSession, Segment } from "./model.js";
import type { Context } from "./store.js";
import { date } from "./http.js";

const targetMs = 1_500_000;

function duration(segments: Segment[], now: Date): number {
  return segments.reduce(
    (sum, segment) =>
      sum +
      Math.max(
        0,
        new Date(segment.end ?? now.toISOString()).getTime() - new Date(segment.start).getTime(),
      ),
    0,
  );
}

function response(session: FocusSession, now: Date) {
  const elapsedSeconds = Math.min(1500, Math.floor(duration(session.segments, now) / 1000));
  const { segments: _segments, ...rest } = session;
  return {
    ...rest,
    targetSeconds: 1500 as const,
    elapsedSeconds,
    remainingSeconds: 1500 - elapsedSeconds,
    serverNow: now.toISOString(),
  };
}

function complete(context: Context, session: FocusSession, at: Date, targetReached: boolean): void {
  const current = session.segments.at(-1);
  if (session.status === "running" && current && current.end === null)
    current.end = at.toISOString();
  session.status = "completed";
  session.endedAt = at.toISOString();
  session.updatedAt = at.toISOString();
  session.version++;
  if (targetReached && session.completeTaskOnTarget && session.taskId) {
    const task = context.state.tasks.find((item) => item.id === session.taskId);
    if (task && !task.isCompleted) {
      task.isCompleted = true;
      task.completedAt = at.toISOString();
      task.isFocusPriority = false;
      task.prioritySelectedAt = null;
      task.updatedAt = at.toISOString();
      task.version++;
      session.taskCompletionApplied = true;
    }
  }
}

export function reconcile(context: Context): void {
  const session = context.state.focusSessions.find((item) => item.status === "running");
  if (!session || duration(session.segments, context.now) < targetMs) return;
  const current = session.segments.at(-1);
  if (!current) return;
  const previous = duration(session.segments.slice(0, -1), context.now);
  const end = new Date(new Date(current.start).getTime() + targetMs - previous);
  complete(context, session, end, true);
}

export function active(context: Context): Result {
  const session = context.state.focusSessions.find(
    (item) => item.status === "running" || item.status === "paused",
  );
  return ok({
    session: session ? response(session, context.now) : null,
    serverNow: context.now.toISOString(),
  });
}

export async function start(
  context: Context,
  request: Request,
  body: Record<string, unknown>,
): Promise<Result> {
  return idempotent(context, request, "/focus/sessions", body, () => {
    only(body, ["taskId", "completeTaskOnTarget"]);
    if (
      context.state.focusSessions.some(
        (item) => item.status === "running" || item.status === "paused",
      )
    )
      conflict("ACTIVE_SESSION_EXISTS", "A focus session is already active");
    if (context.state.focusSessions.length >= 1000)
      throw new ApiError(429, "RATE_LIMITED", "Focus capacity reached until the next reset");
    const taskId =
      body.taskId === null || body.taskId === undefined
        ? null
        : typeof body.taskId === "string"
          ? body.taskId || bad("taskId", "Invalid task ID")
          : bad("taskId", "Invalid task ID");
    const mark =
      body.completeTaskOnTarget === undefined
        ? false
        : typeof body.completeTaskOnTarget === "boolean"
          ? body.completeTaskOnTarget
          : bad("completeTaskOnTarget", "Expected a boolean");
    if (mark && !taskId) bad("completeTaskOnTarget", "Select a task first");
    const task = taskId ? getById(context.state.tasks, taskId) : null;
    if (task?.isCompleted) conflict();
    const now = context.now.toISOString();
    const session: FocusSession = {
      id: randomUUID(),
      status: "running",
      taskId,
      taskTitle: task?.title ?? null,
      completeTaskOnTarget: mark,
      taskCompletionApplied: false,
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      segments: [{ start: now, end: null }],
    };
    context.state.focusSessions.push(session);
    return {
      status: 201,
      body: response(session, context.now),
      location: `/api/minidesk/v1/focus/sessions/${session.id}`,
    };
  });
}

export async function action(
  context: Context,
  request: Request,
  id: string,
  name: "pause" | "resume" | "finish",
  body: Record<string, unknown>,
): Promise<Result> {
  return idempotent(context, request, `/focus/sessions/${id}/${name}`, body, () => {
    only(body, []);
    const session = getById(context.state.focusSessions, id);
    if (name === "finish" && session.status === "completed")
      return ok(response(session, context.now));
    requireVersion(request, session.version);
    const now = context.now.toISOString();
    if (name === "pause") {
      if (session.status !== "running") conflict();
      const segment = session.segments.at(-1);
      if (segment) segment.end = now;
      session.status = "paused";
    } else if (name === "resume") {
      if (session.status !== "paused") conflict();
      session.segments.push({ start: now, end: null });
      session.status = "running";
    } else {
      if (duration(session.segments, context.now) < 1000) conflict();
      complete(context, session, context.now, false);
    }
    if (name !== "finish") {
      session.updatedAt = now;
      session.version++;
    }
    return ok(response(session, context.now));
  });
}

export function discard(context: Context, request: Request, id: string): Result {
  const session = getById(context.state.focusSessions, id);
  requireVersion(request, session.version);
  if (session.status === "completed") conflict();
  context.state.focusSessions = context.state.focusSessions.filter((item) => item.id !== id);
  return noContent();
}

export function sessions(context: Context, url: URL): Result {
  const params = query(url, ["from", "to", "limit", "cursor"]);
  const from = params.has("from") ? date(params.get("from"), "from") : null;
  const to = params.has("to") ? date(params.get("to"), "to") : null;
  if (from && to && from > to) bad("to", "Must be on or after from");
  const items = context.state.focusSessions
    .filter(
      (item) =>
        item.status === "completed" &&
        (!from || (item.endedAt ?? "").slice(0, 10) >= from) &&
        (!to || (item.endedAt ?? "").slice(0, 10) <= to),
    )
    .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "") || a.id.localeCompare(b.id));
  const page = parsePage(items, params, `${from ?? ""}|${to ?? ""}`, context.datasetId);
  return ok({ ...page, items: page.items.map((item) => response(item, context.now)) });
}

function secondsForDay(session: FocusSession, day: string): number {
  const start = new Date(`${day}T00:00:00.000Z`).getTime();
  const end = start + 86_400_000;
  const millis = session.segments.reduce(
    (sum, segment) =>
      sum +
      Math.max(
        0,
        Math.min(new Date(segment.end ?? session.endedAt ?? segment.start).getTime(), end) -
          Math.max(new Date(segment.start).getTime(), start),
      ),
    0,
  );
  return Math.floor(millis / 1000);
}

export function summary(context: Context, url: URL): Result {
  const params = query(url, ["date"]);
  const day = date(params.get("date"), "date");
  const items = context.state.focusSessions.filter((item) => item.status === "completed");
  return ok({
    date: day,
    focusedSeconds: items.reduce((sum, item) => sum + secondsForDay(item, day), 0),
    completedSessionCount: items.filter((item) => secondsForDay(item, day) > 0).length,
    generationFocusedSeconds: items.reduce(
      (sum, item) => sum + Math.min(1500, Math.floor(duration(item.segments, context.now) / 1000)),
      0,
    ),
  });
}
