import assert from "node:assert/strict";
import test from "node:test";
import { validateDeployArtifact } from "../.github/scripts/deploy-artifact.mjs";

const sha = "a".repeat(40);
const mergeSha = "b".repeat(40);
const run = {
  event: "pull_request",
  headSha: sha,
  prNumber: "48",
  repository: "owner/repo",
  headRepository: "contributor/repo",
};
const artifact = { event: "pull_request", pr: 48, sha, runSha: mergeSha };

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
