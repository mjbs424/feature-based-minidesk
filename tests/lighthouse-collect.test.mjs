import assert from "node:assert/strict";
import test from "node:test";
import { collectConfig, redactReport } from "../.github/scripts/lighthouse-collect.mjs";

test("collects the protected preview with a project bypass header", () => {
  const config = collectConfig("https://preview.vercel.app/", "temporary-test-secret");
  assert.deepEqual(config.ci.collect.url, ["https://preview.vercel.app/"]);
  assert.equal(config.ci.collect.numberOfRuns, 3);
  assert.deepEqual(JSON.parse(config.ci.collect.settings.extraHeaders), {
    "x-vercel-protection-bypass": "temporary-test-secret",
    "x-vercel-set-bypass-cookie": "true",
  });
  assert.throws(() => collectConfig("https://vercel.com/login", "secret"), /Preview URL/);
  assert.throws(() => collectConfig("https://preview.vercel.app/", ""), /Preview URL/);
});

test("removes the bypass token from uploaded reports", () => {
  const secret = "private+/token";
  assert.equal(
    redactReport(`value:${secret};encoded:${encodeURIComponent(secret)}`, secret),
    "value:[REDACTED];encoded:[REDACTED]",
  );
});
