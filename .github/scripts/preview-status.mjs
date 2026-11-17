import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const shaPattern = /^[a-f0-9]{40}$/;
const previewPattern = /^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i;
const context = "Preview deployment";

function validateRun(env) {
  const { GITHUB_REPOSITORY: repo, GH_TOKEN: token, RUN_HEAD_SHA: headSha } = env;
  const state = env.PREVIEW_STATE;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? "") || !token || !shaPattern.test(headSha ?? "")) {
    throw new Error("Missing trusted GitHub run information");
  }
  if (!["pending", "success", "failure"].includes(state)) throw new Error("Invalid preview state");
  if (state === "success" && !previewPattern.test(env.PREVIEW_URL ?? "")) {
    throw new Error("Successful preview has no valid deployment URL");
  }
}

async function loadManifest(read, headSha) {
  const manifest = JSON.parse(await read("bundle/manifest.json", "utf8"));
  if (
    manifest.event !== "pull_request" ||
    !Number.isSafeInteger(manifest.pr) ||
    manifest.pr < 1 ||
    manifest.sha !== headSha ||
    !shaPattern.test(manifest.runSha ?? "")
  ) {
    throw new Error("Artifact does not match the pull request workflow run");
  }
  return manifest;
}

function githubClient(repo, token, request) {
  return async (route, options = {}) => {
    const response = await request(`https://api.github.com/repos/${repo}${route}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${route}: ${response.status}`);
    return response.json();
  };
}

function isCurrentPr(pr, env) {
  return (
    pr.state === "open" &&
    pr.base.ref === "main" &&
    pr.head.sha === env.RUN_HEAD_SHA &&
    pr.head.repo?.full_name === env.RUN_HEAD_REPO
  );
}

function statusDetails(env) {
  const state = env.PREVIEW_STATE;
  const targetUrl =
    state === "success"
      ? env.PREVIEW_URL
      : `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  const description = {
    pending: "Preview deployment is running",
    success: "Preview deployed successfully",
    failure: "Preview deployment failed; open workflow logs",
  }[state];
  return { state, context, description, target_url: targetUrl };
}

export async function reportPreviewStatus({
  env = process.env,
  read = readFile,
  request = fetch,
} = {}) {
  validateRun(env);
  const manifest = await loadManifest(read, env.RUN_HEAD_SHA);
  const github = githubClient(env.GITHUB_REPOSITORY, env.GH_TOKEN, request);
  const pr = await github(`/pulls/${manifest.pr}`);
  if (!isCurrentPr(pr, env)) {
    console.log("PR closed or has a newer commit; skipping obsolete preview status");
    return;
  }

  const shas = [env.RUN_HEAD_SHA];
  // GitHub can evaluate required checks against the temporary PR merge commit.
  if (manifest.runSha !== env.RUN_HEAD_SHA && manifest.runSha === pr.merge_commit_sha) {
    shas.push(manifest.runSha);
  }
  for (const sha of shas) {
    await github(`/statuses/${sha}`, {
      method: "POST",
      body: JSON.stringify(statusDetails(env)),
    });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await reportPreviewStatus();
}
