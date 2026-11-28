import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function loadServerModule(file) {
  const result = await build({
    entryPoints: [file],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  const source = Buffer.from(result.outputFiles[0].contents).toString("base64");
  return import(`data:text/javascript;base64,${source}`);
}

const context = () => ({
  state: {
    rumEvents: [],
    focusSessions: [],
    tasks: [],
    idempotency: {},
    writeTicks: [],
    writeCount: 0,
  },
  now: new Date("2026-11-26T11:00:00.000Z"),
  windowStart: "2026-11-26T00:00:00.000Z",
});

test("RUM rejects malformed routes and deduplicates differently cased UUIDs", async () => {
  const { ingest } = await loadServerModule("server/minidesk/rum.ts");
  const ctx = context();
  const event = {
    eventId: "ABCDEFAB-CDEF-ABCD-EFAB-CDEFABCDEFAB",
    kind: "page_view",
    route: "/",
    occurredAt: "2026-11-26T10:00:00.000Z",
  };
  const result = ingest(ctx, {
    events: [
      { ...event, route: ["/"] },
      { ...event, route: { toString: null } },
      event,
      { ...event, eventId: event.eventId.toLowerCase() },
    ],
  });
  assert.deepEqual(result.body, { accepted: 1, rejected: 3 });
  assert.equal(ctx.state.rumEvents[0].eventId, event.eventId.toLowerCase());
});

test("Focus rejects an empty task ID as a validation error", async () => {
  const { start } = await loadServerModule("server/minidesk/focus.ts");
  await assert.rejects(
    start(context(), new Request("https://example.test/focus/sessions", { method: "POST" }), {
      taskId: "",
    }),
    (error) => error.status === 400 && error.fields?.taskId === "Invalid task ID",
  );
});

test("category creation returns the item without an unusable member Location", async () => {
  const { categories } = await loadServerModule("server/minidesk/tasks.ts");
  const ctx = context();
  ctx.state.taskCategories = [];
  const result = categories(ctx, "task", "POST", { label: "Personal" });
  assert.equal(result.status, 201);
  assert.equal(result.location, undefined);
  assert.equal(result.body.label, "Personal");
});

test("a list cursor expires when a shared list changes between pages", async () => {
  const { parsePage } = await loadServerModule("server/minidesk/http.ts");
  const initial = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const first = parsePage(initial, new URLSearchParams("limit=1"), "all", "generation-1");
  assert.deepEqual(first.items, [{ id: "a" }]);
  const params = new URLSearchParams({ limit: "1", cursor: first.nextCursor });
  assert.deepEqual(parsePage(initial, params, "all", "generation-1").items, [{ id: "b" }]);
  assert.throws(
    () => parsePage([{ id: "new" }, ...initial], params, "all", "generation-1"),
    (error) => error.status === 400,
  );
});

test("reconciling an elapsed focus session completes its linked task", async () => {
  const { reconcile } = await loadServerModule("server/minidesk/focus.ts");
  const ctx = context();
  ctx.now = new Date("2026-11-26T10:30:00.000Z");
  ctx.state.tasks = [
    {
      id: "task-1",
      isCompleted: false,
      isFocusPriority: true,
      prioritySelectedAt: "2026-11-26T09:00:00.000Z",
      version: 1,
    },
  ];
  ctx.state.focusSessions = [
    {
      id: "focus-1",
      status: "running",
      taskId: "task-1",
      completeTaskOnTarget: true,
      taskCompletionApplied: false,
      version: 1,
      segments: [{ start: "2026-11-26T10:00:00.000Z", end: null }],
    },
  ];
  reconcile(ctx);
  assert.equal(ctx.state.focusSessions[0].endedAt, "2026-11-26T10:25:00.000Z");
  assert.equal(ctx.state.tasks[0].isCompleted, true);
  assert.equal(ctx.state.tasks[0].completedAt, "2026-11-26T10:25:00.000Z");
});

test("an idempotent focus retry does not consume another write", async () => {
  const { start } = await loadServerModule("server/minidesk/focus.ts");
  const ctx = context();
  const request = new Request("https://example.test/focus/sessions", {
    method: "POST",
    headers: { "Idempotency-Key": "retry-1" },
  });
  const first = await start(ctx, request, {});
  const retry = await start(ctx, request, {});
  assert.deepEqual(retry, first);
  assert.equal(ctx.state.writeCount, 1);
  assert.equal(ctx.state.focusSessions.length, 1);
});
