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

async function loadScores(previewUrl) {
  const directory = ".lighthouseci";
  const files = (await readdir(directory)).filter((name) => /^lhr-.*\.json$/.test(name));
  const results = await Promise.all(
    files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))),
  );
  return summarizeLighthouse(results, previewUrl);
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
  if (action !== "check") throw new Error("Expected pending, check or failed");
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(env.PREVIEW_URL ?? ""))
    throw new Error("Invalid preview URL");
  const scores = await loadScores(env.PREVIEW_URL);
  const rows = categories.map((name) => `| ${name} | ${scores[name]} |`).join("\n");
  const body =
    `${marker}\n### Lighthouse CI baseline\n\nPreview: ${env.PREVIEW_URL}\n` +
    `Commit: \`${manifest.sha}\`\n\nMedian of three mobile runs:\n\n` +
    `| Category | Score / 100 |\n| --- | ---: |\n${rows}\n\n` +
    `This baseline reports scores without enforcing score thresholds. Download the full reports from the deployment workflow artifacts.`;
  await report(
    env,
    manifest,
    "success",
    `Baseline: performance ${scores.performance}/100`,
    body,
    options,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
