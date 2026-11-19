import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { report } from "./bundle-size.mjs";

const marker = "<!-- minidesk-lighthouse -->";
const options = { context: "Lighthouse CI", marker };
const categories = ["performance", "accessibility", "best-practices", "seo"];

export function summarizeLighthouse(results, previewUrl) {
  if (results.length !== 3) throw new Error("Expected three Lighthouse reports");
  const expected = new URL(previewUrl);
  const scores = Object.fromEntries(categories.map((name) => [name, []]));
  for (const result of results) {
    if (
      new URL(result.finalDisplayedUrl ?? result.finalUrl).origin !== expected.origin ||
      result.runtimeError
    )
      throw new Error("Lighthouse did not measure the preview page");
    for (const name of categories) {
      const score = result.categories?.[name]?.score;
      if (typeof score !== "number" || score < 0 || score > 1)
        throw new Error(`Missing Lighthouse score: ${name}`);
      scores[name].push(score);
    }
  }
  return Object.fromEntries(
    categories.map((name) => [name, Math.round(scores[name].sort((a, b) => a - b)[1] * 100)]),
  );
}

export function evaluateLighthouse(scores, proposed, trusted) {
  for (const config of [proposed, trusted]) {
    if (
      Object.keys(config).sort().join(",") !== [...categories].sort().join(",") ||
      categories.some(
        (name) => !Number.isInteger(config[name]) || config[name] < 0 || config[name] > 100,
      )
    )
      throw new Error("Invalid Lighthouse thresholds");
  }
  return categories.map((name) => {
    if (proposed[name] < trusted[name])
      throw new Error(`Lighthouse threshold is below the trusted policy: ${name}`);
    return {
      name,
      score: scores[name],
      minimum: proposed[name],
      passed: scores[name] >= proposed[name],
    };
  });
}

async function loadScores(previewUrl) {
  const directory = ".lighthouseci";
  const files = (await readdir(directory)).filter((name) => /^lhr-.*\.json$/.test(name));
  const results = await Promise.all(
    files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))),
  );
  return summarizeLighthouse(results, previewUrl);
}

async function check(env, manifest) {
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(env.PREVIEW_URL ?? ""))
    throw new Error("Invalid preview URL");
  const scores = await loadScores(env.PREVIEW_URL);
  const proposed = JSON.parse(await readFile("bundle/lighthouse-thresholds.json", "utf8"));
  const trusted = JSON.parse(await readFile(".github/lighthouse-thresholds.json", "utf8"));
  const results = evaluateLighthouse(scores, proposed, trusted);
  const failed = results.filter((row) => !row.passed);
  const rows = results
    .map(
      (row) => `| ${row.name} | ${row.score} | ${row.minimum} | ${row.passed ? "Pass" : "Fail"} |`,
    )
    .join("\n");
  const body =
    `${marker}\n### Lighthouse CI\n\nPreview: ${env.PREVIEW_URL}\n` +
    `Commit: \`${manifest.sha}\`\n\nMedian of three mobile runs:\n\n` +
    `| Category | Score / 100 | Minimum | Result |\n| --- | ---: | ---: | :---: |\n${rows}\n\n` +
    `${failed.length} category(s) below the minimum. Download the full reports from the deployment workflow artifacts.`;
  await report(
    env,
    manifest,
    failed.length ? "failure" : "success",
    failed.length
      ? `${failed.length} Lighthouse category(s) below minimum`
      : "Lighthouse scores meet minimums",
    body,
    options,
  );
  if (failed.length) process.exitCode = 1;
}

export async function publishCheckedLighthouse(runCheck, publishFailure) {
  try {
    await runCheck();
  } catch (error) {
    await publishFailure();
    throw error;
  }
}

async function main() {
  const env = process.env;
  const manifest = JSON.parse(await readFile("bundle/manifest.json", "utf8"));
  if (manifest.event !== "pull_request")
    throw new Error("Lighthouse status requires a PR artifact");
  const action = process.argv[2];
  if (action === "pending")
    return report(env, manifest, "pending", "Waiting for Lighthouse measurements", null, options);
  if (action === "failed")
    return report(
      env,
      manifest,
      "failure",
      "Lighthouse could not measure the preview",
      null,
      options,
    );
  if (action === "check")
    return publishCheckedLighthouse(
      () => check(env, manifest),
      () =>
        report(
          env,
          manifest,
          "failure",
          "Lighthouse policy or report rejected",
          `${marker}\n### Lighthouse CI\n\nPolicy or report validation failed. See workflow logs.`,
          options,
        ),
    );
  throw new Error("Expected pending, check or failed");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
