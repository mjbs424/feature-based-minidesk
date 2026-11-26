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
  state: { rumEvents: [], focusSessions: [], tasks: [], idempotency: {} },
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
