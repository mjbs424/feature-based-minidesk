import { lstat, readFile, readdir, rm, mkdir, cp, writeFile, appendFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { removePrDeployments, vercel } from "./cleanup.mjs";
import { assertTrustedBuildOutputConfig } from "./build-output-config.mjs";

const repo = process.env.GITHUB_REPOSITORY;
const [owner, name] = (repo ?? "").split("/");
const ghToken = process.env.GH_TOKEN;
const sha = process.env.RUN_HEAD_SHA;
const runEvent = process.env.RUN_EVENT;
const manifest = JSON.parse(await readFile("bundle/manifest.json", "utf8"));

if (!owner || !name || !ghToken || !/^[a-f0-9]{40}$/.test(sha ?? "")) {
  throw new Error("Missing trusted GitHub run information");
}
if (
  manifest.event !== runEvent ||
  (manifest.runSha !== sha && manifest.sha !== sha) ||
  !/^[a-f0-9]{40}$/.test(manifest.sha ?? "")
) {
  throw new Error("Artifact does not match the successful workflow run");
}

async function github(route, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${route}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${route}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function currentPr() {
  const pr = await github(`/pulls/${manifest.pr}`);
  return Object.values({
    open: pr.state === "open",
    base: pr.base.ref === "main",
    commit: pr.head.sha === manifest.sha,
    repository: pr.head.repo?.full_name === process.env.RUN_HEAD_REPO,
  }).every(Boolean);
}

if (runEvent === "pull_request") {
  if (!Number.isSafeInteger(manifest.pr) || manifest.pr < 1) throw new Error("Invalid PR metadata");
  if (!(await currentPr())) {
    console.log("PR closed or has a newer commit; skipping obsolete preview");
    process.exit(0);
  }
} else if (runEvent === "push") {
  if (manifest.pr !== null || process.env.GITHUB_REPOSITORY !== process.env.RUN_HEAD_REPO) {
    throw new Error("Invalid production artifact metadata");
  }
  const branch = await github("/branches/main");
  if (branch.commit.sha !== manifest.sha) {
    console.log("A newer main commit exists; skipping obsolete production deployment");
    process.exit(0);
  }
} else {
  throw new Error("Unsupported event type");
}

// Accept only the static Build Output API shape. Never execute artifact content.
const source = "bundle/.vercel/output";
const config = JSON.parse(await readFile(`${source}/config.json`, "utf8"));
assertTrustedBuildOutputConfig(config);
const roots = await readdir(source);
if (roots.sort().join(",") !== "config.json,static")
  throw new Error("Unexpected build output entries");
async function validateTree(directory) {
  for (const entry of await readdir(directory)) {
    const file = path.join(directory, entry);
    const stat = await lstat(file);
    if (stat.isDirectory()) await validateTree(file);
    else if (!stat.isFile()) throw new Error(`Unsupported output entry: ${file}`);
  }
}
await validateTree(`${source}/static`);
await rm(".vercel", { recursive: true, force: true });
await mkdir(".vercel", { recursive: true });
await writeFile(
  ".vercel/project.json",
  JSON.stringify({
    orgId: process.env.VERCEL_ORG_ID,
    projectId:
      runEvent === "push" ? process.env.VERCEL_PROJECT_ID : process.env.VERCEL_PREVIEW_PROJECT_ID,
  }),
);
await cp(source, ".vercel/output", { recursive: true });

const args = ["deploy", "--prebuilt", "--yes", "--token", process.env.VERCEL_TOKEN];
if (runEvent === "push") args.push("--prod");
else args.push("--meta", `minideskPr=${manifest.pr}`, "--meta", `minideskSha=${manifest.sha}`);
const result = spawnSync("vercel", args, { encoding: "utf8" });
if (result.status !== 0) throw new Error(`Vercel deploy failed: ${result.stderr}`);
const url = result.stdout.trim().split(/\s+/).at(-1);
if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(url)) {
  throw new Error(`Unexpected Vercel deployment URL: ${url}`);
}
console.log(`Deployment: ${url}`);

if (runEvent === "pull_request") {
  if (!(await currentPr())) {
    await removePrDeployments(manifest.pr);
    console.log("PR changed during deployment; removed obsolete preview");
    process.exit(0);
  }
  const marker = "<!-- minidesk-preview -->";
  const deploymentId = await lookupDeployment(url);
  const body = `${marker}\nPreview for PR #${manifest.pr}: ${url}\n\nCommit: \`${manifest.sha}\`. QA should review this commit before merge.`;
  let existing;
  for (let page = 1; page < 20 && !existing; page++) {
    const comments = await github(`/issues/${manifest.pr}/comments?per_page=100&page=${page}`);
    existing = comments.find(
      (comment) => comment.user?.type === "Bot" && comment.body?.includes(marker),
    );
    if (comments.length < 100) break;
  }
  if (existing) {
    await github(`/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
  } else {
    await github(`/issues/${manifest.pr}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
  await removePrDeployments(manifest.pr, deploymentId);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `preview_url=${url}\n`);
  }
}

async function lookupDeployment(deploymentUrl) {
  const host = new URL(deploymentUrl).host;
  const detail = await vercel(`/v13/deployments/${host}`);
  if (
    detail.projectId !== process.env.VERCEL_PREVIEW_PROJECT_ID ||
    detail.meta?.minideskPr !== String(manifest.pr)
  ) {
    throw new Error("Preview deployment does not belong to this PR/project");
  }
  return detail.id;
}
