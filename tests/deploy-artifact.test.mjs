import assert from "node:assert/strict";
import test from "node:test";
import {
  isUntrustedFunctionPreview,
  resolveTrustedPrNumber,
  validateDeployArtifact,
} from "../.github/scripts/deploy-artifact.mjs";

const sha = "a".repeat(40);
const mergeSha = "b".repeat(40);
const run = {
  event: "pull_request",
  headSha: sha,
  prNumber: "48",
  repository: "owner/repo",
  headRepository: "contributor/repo",
  headBranch: "feature-branch",
};
const artifact = { event: "pull_request", pr: 48, sha, runSha: mergeSha };

test("only fork Function previews are excluded from the shared Preview project", () => {
  assert.equal(
    isUntrustedFunctionPreview("minidesk", "pull_request", run.headRepository, run.repository),
    true,
  );
  assert.equal(
    isUntrustedFunctionPreview("minidesk", "pull_request", undefined, run.repository),
    true,
  );
  assert.equal(
    isUntrustedFunctionPreview("minidesk", "pull_request", run.repository, run.repository),
    false,
  );
  assert.equal(
    isUntrustedFunctionPreview("static", "pull_request", run.headRepository, run.repository),
    false,
  );
  assert.equal(
    isUntrustedFunctionPreview("minidesk", "push", run.headRepository, run.repository),
    false,
  );
});

test("accepts only the run's exact PR head and PR number", () => {
  assert.equal(validateDeployArtifact(artifact, run), 48);
  assert.throws(
    () => validateDeployArtifact({ ...artifact, sha: mergeSha, runSha: sha }, run),
    /successful workflow run/,
  );
  assert.throws(
    () => validateDeployArtifact({ ...artifact, pr: 47 }, run),
    /trusted pull request number/,
  );
  assert.throws(
    () => validateDeployArtifact(artifact, { ...run, prNumber: "" }),
    /trusted pull request number/,
  );
});

test("production artifact must match the main push and repository", () => {
  const push = { ...run, event: "push", prNumber: "", headRepository: "owner/repo" };
  assert.equal(validateDeployArtifact({ event: "push", pr: null, sha }, push), null);
  assert.throws(
    () => validateDeployArtifact({ event: "push", pr: 48, sha }, push),
    /production artifact/,
  );
  assert.throws(
    () =>
      validateDeployArtifact(
        { event: "push", pr: null, sha },
        { ...push, headRepository: "contributor/repo" },
      ),
    /production artifact/,
  );
});

test("fork run resolves its PR from the trusted commit and repository", async () => {
  const github = async (route) => {
    assert.equal(
      route,
      "/pulls?state=open&base=main&head=contributor%3Afeature-branch&per_page=100",
    );
    return [
      {
        number: 47,
        state: "open",
        base: { ref: "main" },
        head: { sha, repo: { full_name: "other/repo" } },
      },
      {
        number: 48,
        state: "open",
        base: { ref: "main" },
        head: { sha, repo: { full_name: run.headRepository } },
      },
    ];
  };
  const resolved = await resolveTrustedPrNumber(github, { ...run, prNumber: "" });
  assert.equal(validateDeployArtifact(artifact, { ...run, prNumber: resolved }), 48);
  assert.equal(await resolveTrustedPrNumber(github, run), 48);
});

test("fork run fails closed when GitHub metadata is absent or ambiguous", async () => {
  const candidate = {
    number: 48,
    state: "open",
    base: { ref: "main" },
    head: { sha, repo: { full_name: run.headRepository } },
  };
  await assert.rejects(
    resolveTrustedPrNumber(async () => [], { ...run, prNumber: "" }),
    /unique pull request/,
  );
  await assert.rejects(
    resolveTrustedPrNumber(async () => [candidate, { ...candidate, number: 49 }], {
      ...run,
      prNumber: "",
    }),
    /unique pull request/,
  );
});
