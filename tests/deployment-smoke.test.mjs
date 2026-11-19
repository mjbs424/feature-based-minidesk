import assert from "node:assert/strict";
import test from "node:test";
import { smokeDeployment } from "../.github/scripts/deployment-smoke.mjs";

const url = "https://minidesk-preview.vercel.app/";
const html =
  '<div id="root"></div><script src="/assets/app-123.js"></script><link href="/assets/app-123.css" rel="stylesheet">';

test("checks the deployed application and its built assets", async () => {
  const seen = [];
  await smokeDeployment(url, "test-secret", async (target, options) => {
    seen.push([target.pathname, options.headers["x-vercel-protection-bypass"]]);
    return new Response(target.pathname === "/" ? html : "built asset", {
      headers: { "content-type": target.pathname === "/" ? "text/html" : "text/plain" },
    });
  });
  assert.deepEqual(seen, [
    ["/", "test-secret"],
    ["/assets/app-123.js", "test-secret"],
    ["/assets/app-123.css", "test-secret"],
  ]);
});

test("rejects an external redirect without sending the bypass secret to that host", async () => {
  let calls = 0;
  await assert.rejects(
    smokeDeployment(url, "test-secret", async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location: "https://example.com/" } });
    }),
    /outside its origin/,
  );
  assert.equal(calls, 1);
});

test("rejects login pages and missing built assets", async () => {
  await assert.rejects(
    smokeDeployment(
      url,
      "test-secret",
      async () => new Response("<h1>Sign in</h1>", { headers: { "content-type": "text/html" } }),
    ),
    /application page/,
  );
  await assert.rejects(
    smokeDeployment(
      url,
      "",
      async () =>
        new Response('<div id="root"></div>', { headers: { "content-type": "text/html" } }),
    ),
    /no built JavaScript or stylesheet/,
  );
});
