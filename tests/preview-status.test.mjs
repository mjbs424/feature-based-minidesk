import assert from "node:assert/strict";
import { test } from "node:test";
import { reportPreviewStatus } from "../.github/scripts/preview-status.mjs";

const head = "a".repeat(40);
const merge = "b".repeat(40);
const env = {
  GITHUB_REPOSITORY: "owner/repo",
  GH_TOKEN: "test-token",
  GITHUB_RUN_ID: "123",
  RUN_HEAD_SHA: head,
  RUN_HEAD_REPO: "owner/repo",
  PREVIEW_URL: "https://preview.vercel.app",
};
const manifest = { event: "pull_request", pr: 4, sha: head, runSha: merge };
const pr = {
  state: "open",
  base: { ref: "main" },
  head: { sha: head, repo: { full_name: "owner/repo" } },
  merge_commit_sha: merge,
};

function fixture(state, { artifact = manifest, pull = pr } = {}) {
  const posts = [];
  const read = async () => JSON.stringify(artifact);
  const request = async (url, options) => {
    if (url.endsWith("/pulls/4")) return Response.json(pull);
    if (options.method === "POST" && url.includes("/statuses/")) {
      posts.push({ sha: url.split("/").at(-1), ...JSON.parse(options.body) });
      return Response.json({});
    }
    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  return { env: { ...env, PREVIEW_STATE: state }, read, request, posts };
}

test("successful deployment reports on head and checked merge commit with the preview URL", async () => {
  const data = fixture("success");
  await reportPreviewStatus(data);
  assert.deepEqual(
    data.posts.map(({ sha, state, context, target_url }) => ({
      sha,
      state,
      context,
      target_url,
    })),
    [head, merge].map((sha) => ({
      sha,
      state: "success",
      context: "Preview deployment",
      target_url: "https://preview.vercel.app",
    })),
  );
});

test("deployment failure points to the workflow and never reports success", async () => {
  const data = fixture("failure");
  await reportPreviewStatus(data);
  assert.equal(data.posts.length, 2);
  assert.ok(data.posts.every((post) => post.state === "failure"));
  assert.equal(data.posts[0].target_url, "https://github.com/owner/repo/actions/runs/123");
});

test("fork Function skip closes preview status without claiming a deployed URL", async () => {
  const data = fixture("skipped");
  data.env.RUN_HEAD_REPO = "contributor/repo";
  data.env.PREVIEW_URL = "";
  data.request = async (url, options) => {
    if (url.endsWith("/pulls/4"))
      return Response.json({
        ...pr,
        head: { ...pr.head, repo: { full_name: "contributor/repo" } },
      });
    if (options.method === "POST" && url.includes("/statuses/")) {
      data.posts.push(JSON.parse(options.body));
      return Response.json({});
    }
    throw new Error(`Unexpected GitHub request: ${url}`);
  };
  await reportPreviewStatus(data);
  assert.equal(data.posts.length, 2);
  assert.ok(
    data.posts.every((post) => post.state === "success" && post.description.includes("skipped")),
  );
  assert.ok(data.posts.every((post) => post.target_url.includes("/actions/runs/")));
});

test("rejects an artifact for another commit before posting any status", async () => {
  const data = fixture("success", { artifact: { ...manifest, sha: "c".repeat(40) } });
  await assert.rejects(reportPreviewStatus(data), /Artifact does not match/);
  assert.equal(data.posts.length, 0);
});

test("does not report on an obsolete PR", async () => {
  const data = fixture("success", { pull: { ...pr, head: { ...pr.head, sha: "c".repeat(40) } } });
  await reportPreviewStatus(data);
  assert.equal(data.posts.length, 0);
});

test("does not report on a new merge commit that was not checked", async () => {
  const data = fixture("pending", { pull: { ...pr, merge_commit_sha: "c".repeat(40) } });
  await reportPreviewStatus(data);
  assert.deepEqual(
    data.posts.map((post) => post.sha),
    [head],
  );
});
