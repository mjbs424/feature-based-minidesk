import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const context = "Bundle size";
const marker = "<!-- minidesk-bundle-size -->";
const shaPattern = /^[a-f0-9]{40}$/;

async function assets(directory, prefix = "") {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory())
      found.push(...(await assets(path.join(directory, entry.name), relative)));
    else if (entry.isFile() && /\.(?:js|css)$/.test(entry.name)) found.push(relative);
  }
  return found.sort();
}

export function stableName(file) {
  return file.replace(/^(.+)-[a-zA-Z0-9_-]{8,}(\.(?:js|css))$/, "$1$2");
}

export function enforceTrustedLimits(rows, trusted) {
  for (const row of rows) {
    const allowed = trusted.overrides[row.key] ?? trusted.defaultLimitKB;
    if (!Number.isSafeInteger(allowed) || allowed <= 0 || row.limitKB > allowed)
      throw new Error(`Bundle size limit exceeds the trusted policy: ${row.key}`);
  }
}

export async function measureBundles(root, config, calculate) {
  if (
    !Number.isSafeInteger(config.defaultLimitKB) ||
    config.defaultLimitKB <= 0 ||
    !config.overrides ||
    Array.isArray(config.overrides) ||
    typeof config.overrides !== "object"
  ) {
    throw new Error("Invalid bundle size configuration");
  }
  for (const [name, value] of Object.entries(config.overrides)) {
    if (
      !/^[\w./-]+\.(?:js|css)$/.test(name) ||
      name.includes("..") ||
      !Number.isSafeInteger(value) ||
      value <= 0
    ) {
      throw new Error(`Invalid bundle size exception: ${name}`);
    }
  }
  const names = await assets(root);
  if (!names.some((name) => name.endsWith(".js")))
    throw new Error("No JavaScript build assets found");
  const [{ default: filePlugin }, { default: sizeLimit }] = await Promise.all([
    import("@size-limit/file"),
    import("size-limit"),
  ]);
  const checks = names.map((name) => ({ files: [path.join(root, ...name.split("/"))] }));
  const sizes = await (calculate ?? sizeLimit)(filePlugin, { checks });
  if (sizes.length !== names.length) throw new Error("Incomplete bundle size results");
  const rows = names.map((name, index) => {
    const key = stableName(name);
    const limitKB = config.overrides[key] ?? config.defaultLimitKB;
    const bytes = sizes[index].size;
    if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`Invalid size: ${name}`);
    return { name, key, bytes, limitKB, passed: bytes <= limitKB * 1000 };
  });
  const keys = new Set(rows.map((row) => row.key));
  for (const name of Object.keys(config.overrides)) {
    if (!keys.has(name)) throw new Error(`Unused bundle size exception: ${name}`);
  }
  return rows;
}

function githubClient(env) {
  const base = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  const headers = {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
  return (route, options = {}) => github(base, headers, route, options);
}

async function github(base, headers, route, options) {
  const response = await fetch(`${base}${route}`, { ...options, headers });
  if (!response.ok) throw new Error(`GitHub API ${route}: ${response.status}`);
  return response.json();
}

function validateMetadata(env, manifest) {
  const checks = [
    /^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? ""),
    Boolean(env.GH_TOKEN),
    shaPattern.test(env.RUN_HEAD_SHA ?? ""),
    manifest.sha === env.RUN_HEAD_SHA,
    shaPattern.test(manifest.runSha ?? ""),
    Number.isSafeInteger(manifest.pr),
  ];
  if (checks.includes(false)) {
    throw new Error("Invalid bundle status metadata");
  }
}

function isCurrent(pr, manifest, env) {
  return (
    pr.state === "open" &&
    pr.base.ref === "main" &&
    pr.head.sha === manifest.sha &&
    pr.head.repo?.full_name === env.RUN_HEAD_REPO
  );
}

async function postStatus(request, env, manifest, pr, state, description, statusContext) {
  const shas = [manifest.sha];
  if (manifest.runSha !== manifest.sha && manifest.runSha === pr.merge_commit_sha) {
    shas.push(manifest.runSha);
  }
  for (const sha of shas) {
    await request(`/statuses/${sha}`, {
      method: "POST",
      body: JSON.stringify({
        state,
        context: statusContext,
        description: description.slice(0, 140),
        target_url: `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
      }),
    });
  }
}

async function updateComment(request, prNumber, body, commentMarker) {
  let previous;
  for (let page = 1; page < 20; page++) {
    const batch = await request(`/issues/${prNumber}/comments?per_page=100&page=${page}`);
    previous = batch.find(
      ({ user, body: text }) => user?.type === "Bot" && text?.includes(commentMarker),
    );
    if (previous || batch.length < 100) break;
  }
  const destination = previous ? `/issues/comments/${previous.id}` : `/issues/${prNumber}/comments`;
  await request(destination, {
    method: previous ? "PATCH" : "POST",
    body: JSON.stringify({ body }),
  });
}

export async function report(env, manifest, state, description, body, options = {}) {
  validateMetadata(env, manifest);
  const request = githubClient(env);
  const pr = await request(`/pulls/${manifest.pr}`);
  if (!isCurrent(pr, manifest, env)) {
    console.log("PR changed; skipping obsolete bundle size report");
    return;
  }
  await postStatus(request, env, manifest, pr, state, description, options.context ?? context);
  if (body) await updateComment(request, manifest.pr, body, options.marker ?? marker);
}

function summary(rows, sha) {
  const failed = rows.filter((row) => !row.passed);
  const lines = rows.map(
    (row) =>
      `| \`${row.name}\` | ${(row.bytes / 1000).toFixed(2)} kB | ${row.limitKB} kB | ${row.passed ? "Pass" : "Fail"} |`,
  );
  const body =
    `${marker}\n### Bundle size (Brotli)\n\nCommit: \`${sha}\`\n\n` +
    `| File | Size | Limit | Result |\n| --- | ---: | ---: | :---: |\n${lines.join("\n")}\n\n` +
    (failed.length
      ? `${failed.length} file(s) exceed their limits.`
      : "All files are within their limits.");
  const description = failed.length
    ? `${failed.length} JS/CSS file(s) exceed the limit`
    : "All JS/CSS files are within limits";
  return { failed, body, description };
}

async function check(env, manifest) {
  try {
    const config = JSON.parse(await readFile("bundle/bundle-size.json", "utf8"));
    const trusted = JSON.parse(await readFile(".github/bundle-size.json", "utf8"));
    const rows = await measureBundles("bundle/.vercel/output/static", config);
    enforceTrustedLimits(rows, trusted);
    const result = summary(rows, manifest.sha);
    await report(
      env,
      manifest,
      result.failed.length ? "failure" : "success",
      result.description,
      result.body,
    );
    if (result.failed.length) process.exitCode = 1;
  } catch (error) {
    const message = error.message.replaceAll("`", "'");
    await report(
      env,
      manifest,
      "failure",
      "Bundle size check failed; open workflow logs",
      `${marker}\n### Bundle size\n\nCheck failed: ${message}. See workflow logs.`,
    );
    throw error;
  }
}

async function main() {
  const env = process.env;
  const manifest = JSON.parse(await readFile("bundle/manifest.json", "utf8"));
  if (manifest.event !== "pull_request") throw new Error("Bundle status requires a PR artifact");
  const action = process.argv[2];
  if (action === "pending")
    return report(env, manifest, "pending", "Waiting for preview deployment and asset sizes");
  if (action === "failed")
    return report(
      env,
      manifest,
      "failure",
      "Preview or bundle size check failed; open workflow logs",
    );
  if (action === "check") return check(env, manifest);
  throw new Error("Expected pending, check or failed");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
