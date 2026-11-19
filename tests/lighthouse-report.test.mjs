import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLighthouse, summarizeLighthouse } from "../.github/scripts/lighthouse-report.mjs";

const preview = "https://example.vercel.app/";
const result = (score, url = preview) => ({
  finalDisplayedUrl: url,
  categories: Object.fromEntries(
    ["performance", "accessibility", "best-practices", "seo"].map((name) => [name, { score }]),
  ),
});

test("uses the median of three preview measurements", () => {
  const scores = summarizeLighthouse([result(0.9), result(0.6), result(0.8)], preview);
  assert.deepEqual(scores, {
    performance: 80,
    accessibility: 80,
    "best-practices": 80,
    seo: 80,
  });
});

test("rejects incomplete reports and redirects outside the preview", () => {
  assert.throws(() => summarizeLighthouse([result(1)], preview), /three Lighthouse reports/);
  assert.throws(
    () =>
      summarizeLighthouse([result(1), result(1, "https://login.example.com/"), result(1)], preview),
    /did not measure the preview page/,
  );
});

test("strict PR SEO threshold fails while trusted baseline passes", () => {
  const scores = { performance: 100, accessibility: 91, "best-practices": 100, seo: 45 };
  const trusted = { performance: 90, accessibility: 90, "best-practices": 90, seo: 40 };
  const strict = { ...trusted, seo: 70 };
  assert.deepEqual(
    evaluateLighthouse(scores, strict, trusted)
      .filter((row) => !row.passed)
      .map((row) => row.name),
    ["seo"],
  );
  assert.ok(evaluateLighthouse(scores, trusted, trusted).every((row) => row.passed));
  assert.throws(
    () => evaluateLighthouse(scores, { ...trusted, performance: 80 }, trusted),
    /below the trusted policy/,
  );
});
