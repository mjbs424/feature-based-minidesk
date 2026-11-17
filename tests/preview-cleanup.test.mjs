import assert from "node:assert/strict";
import { test } from "node:test";

process.env.VERCEL_TOKEN = "test-token";
process.env.VERCEL_ORG_ID = "team_test";
process.env.VERCEL_PREVIEW_PROJECT_ID = "prj_preview";

const { removePrDeployments } = await import("../.github/scripts/cleanup.mjs");

test("cleanup removes only old deployments for the requested PR", async (context) => {
  const deleted = [];
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url, options) => {
    const request = new URL(url);
    assert.equal(request.searchParams.get("teamId"), "team_test");

    if (request.pathname === "/v6/deployments") {
      return Response.json({
        deployments: [
          { uid: "old", meta: { minideskPr: "12" } },
          { uid: "current", meta: { minideskPr: "12" } },
          { uid: "other-pr", meta: { minideskPr: "13" } },
          { uid: "untagged", meta: {} },
        ],
        pagination: { next: null },
      });
    }
    if (request.pathname === "/v13/deployments/old" && options.method === "GET") {
      return Response.json({ projectId: "prj_preview", meta: { minideskPr: "12" } });
    }
    if (request.pathname === "/v13/deployments/old" && options.method === "DELETE") {
      deleted.push("old");
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected Vercel request: ${options.method} ${request.pathname}`);
  };

  await removePrDeployments(12, "current");
  assert.deepEqual(deleted, ["old"]);
});

test("cleanup rejects a mismatched deployment detail before deleting", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, options) => {
    const request = new URL(url);
    if (request.pathname === "/v6/deployments") {
      return Response.json({
        deployments: [{ uid: "wrong-project", meta: { minideskPr: "12" } }],
        pagination: { next: null },
      });
    }
    if (options.method === "GET") {
      return Response.json({ projectId: "prj_production", meta: { minideskPr: "12" } });
    }
    throw new Error("Unexpected deletion");
  };

  await assert.rejects(removePrDeployments(12), /failed project\/PR verification/);
});
