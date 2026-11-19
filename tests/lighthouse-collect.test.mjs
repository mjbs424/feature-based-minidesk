import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapBypassCookie,
  collectConfig,
  redactReport,
} from "../.github/scripts/lighthouse-collect.mjs";
import setPreviewCookie from "../.github/scripts/lighthouse-cookie.cjs";

test("collects the protected preview without page-wide headers", () => {
  const config = collectConfig("https://preview.vercel.app/");
  assert.deepEqual(config.ci.collect.url, ["https://preview.vercel.app/"]);
  assert.equal(config.ci.collect.numberOfRuns, 3);
  assert.equal(config.ci.collect.settings.extraHeaders, undefined);
  assert.equal(config.ci.collect.settings.disableStorageReset, true);
  assert.throws(() => collectConfig("https://vercel.com/login"), /Preview URL/);
});

test("bootstrap sends the secret only to the preview without following redirects", async () => {
  const calls = [];
  const cookie = await bootstrapBypassCookie(
    "https://preview.vercel.app/",
    "secret",
    (url, options) => {
      calls.push({ url, options });
      return { status: 307, headers: { getSetCookie: () => ["_vercel_jwt=jwt-value; HttpOnly"] } };
    },
  );
  assert.deepEqual(cookie, { name: "_vercel_jwt", value: "jwt-value" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://preview.vercel.app/");
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[0].options.headers["x-vercel-protection-bypass"], "secret");
});

test("browser cookie is HttpOnly and scoped to the preview host", async () => {
  const previousUrl = process.env.PREVIEW_URL;
  const previousCookie = process.env.VERCEL_PREVIEW_COOKIE;
  process.env.PREVIEW_URL = "https://preview.vercel.app/";
  process.env.VERCEL_PREVIEW_COOKIE = JSON.stringify({ name: "_vercel_jwt", value: "jwt-value" });
  let configured;
  const browser = {
    newPage: async () => ({
      setCookie: async (cookie) => {
        configured = cookie;
      },
      close: async () => {},
    }),
  };
  try {
    await setPreviewCookie(browser, { url: process.env.PREVIEW_URL });
    assert.equal(configured.url, "https://preview.vercel.app/");
    assert.equal(configured.httpOnly, true);
    assert.equal(configured.domain, undefined);
    await assert.rejects(
      () => setPreviewCookie(browser, { url: "https://attacker.example/" }),
      /Unexpected Lighthouse preview URL/,
    );
  } finally {
    if (previousUrl === undefined) delete process.env.PREVIEW_URL;
    else process.env.PREVIEW_URL = previousUrl;
    if (previousCookie === undefined) delete process.env.VERCEL_PREVIEW_COOKIE;
    else process.env.VERCEL_PREVIEW_COOKIE = previousCookie;
  }
});

test("removes the bypass token and cookie from uploaded reports", () => {
  const secret = "private+/token";
  assert.equal(
    redactReport(`value:${secret};encoded:${encodeURIComponent(secret)};cookie:jwt-value`, [
      secret,
      "jwt-value",
    ]),
    "value:[REDACTED];encoded:[REDACTED];cookie:[REDACTED]",
  );
});
