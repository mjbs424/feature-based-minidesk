import { ok } from "./http.js";
import { bad } from "./errors.js";
import type { RumEvent } from "./model.js";
import type { Context } from "./store.js";
import type { Result } from "./http.js";

const routes = ["/", "/expenses", "/focus", "/real-user-monitoring"];
const metrics = ["LCP", "INP", "CLS"] as const;

function validEvent(value: unknown, context: Context): value is RumEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  if (
    typeof event.eventId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.eventId)
  )
    return false;
  if (!routes.includes(String(event.route)) || typeof event.occurredAt !== "string") return false;
  const at = new Date(event.occurredAt);
  if (
    !Number.isFinite(at.getTime()) ||
    at.toISOString() !== event.occurredAt ||
    at.getTime() < new Date(context.windowStart).getTime() ||
    at.getTime() > context.now.getTime() + 300_000
  )
    return false;
  if (event.kind === "page_view")
    return (
      Object.keys(event).sort().join() === ["eventId", "kind", "occurredAt", "route"].sort().join()
    );
  if (
    event.kind !== "web_vital" ||
    !metrics.includes(event.metric as (typeof metrics)[number]) ||
    typeof event.value !== "number" ||
    !Number.isFinite(event.value)
  )
    return false;
  const max = event.metric === "LCP" ? 60000 : event.metric === "INP" ? 10000 : 10;
  return (
    event.value >= 0 &&
    event.value <= max &&
    Object.keys(event).sort().join() ===
      ["eventId", "kind", "occurredAt", "route", "metric", "value"].sort().join()
  );
}

export function ingest(context: Context, body: Record<string, unknown>): Result {
  if (
    Object.keys(body).join() !== "events" ||
    !Array.isArray(body.events) ||
    body.events.length < 1 ||
    body.events.length > 20
  )
    bad("events", "Expected 1–20 events");
  let accepted = 0;
  let rejected = 0;
  const seen = new Set(context.state.rumEvents.map((event) => event.eventId));
  for (const candidate of body.events as unknown[]) {
    if (
      !validEvent(candidate, context) ||
      seen.has(candidate.eventId) ||
      context.state.rumEvents.length >= 5000
    ) {
      rejected++;
      continue;
    }
    seen.add(candidate.eventId);
    context.state.rumEvents.push(candidate);
    accepted++;
  }
  return ok({ accepted, rejected }, 202);
}

export function overview(context: Context): Result {
  const events = context.state.rumEvents;
  const views = events.filter((event) => event.kind === "page_view");
  const hourly: { hourStart: string; pageViews: number }[] = [];
  for (
    let at = new Date(context.windowStart).getTime();
    at <= context.now.getTime();
    at += 3_600_000
  ) {
    const hourStart = new Date(at).toISOString();
    hourly.push({
      hourStart,
      pageViews: views.filter(
        (event) =>
          event.occurredAt >= hourStart &&
          event.occurredAt < new Date(at + 3_600_000).toISOString(),
      ).length,
    });
  }
  const vitals = metrics.map((metric) => {
    const values = events
      .filter((event) => event.kind === "web_vital" && event.metric === metric)
      .map((event) => event.value as number)
      .sort((a, b) => a - b);
    return {
      metric,
      sampleCount: values.length,
      p75: values.length ? values[Math.ceil(values.length * 0.75) - 1] : null,
    };
  });
  return ok({
    windowStart: context.windowStart,
    resetAt: context.resetAt,
    timeZone: "UTC",
    pageViews: views.length,
    hourly,
    routes: routes.map((route) => ({
      route,
      pageViews: views.filter((event) => event.route === route).length,
    })),
    vitals,
  });
}
