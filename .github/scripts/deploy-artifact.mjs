const shaPattern = /^[a-f0-9]{40}$/;

export async function resolveTrustedPrNumber(github, run) {
  const direct = Number(run.prNumber);
  if (Number.isSafeInteger(direct) && direct > 0) return direct;
  // workflow_run.pull_requests can be empty for forks. Search by trusted run
  // metadata and require one exact current head; never use manifest.pr here.
  const owner = run.headRepository?.split("/")[0];
  if (!shaPattern.test(run.headSha ?? "") || !owner || !run.headBranch)
    throw new Error("Missing trusted pull request run information");
  const head = encodeURIComponent(`${owner}:${run.headBranch}`);
  const pulls = await github(`/pulls?state=open&base=main&head=${head}&per_page=100`);
  const matches = pulls.filter(
    (pr) =>
      pr.state === "open" &&
      pr.base?.ref === "main" &&
      pr.head?.sha === run.headSha &&
      pr.head?.repo?.full_name === run.headRepository,
  );
  if (matches.length !== 1)
    throw new Error("Could not resolve a unique pull request from trusted run metadata");
  return matches[0].number;
}

export function validateDeployArtifact(manifest, run) {
  if (
    !shaPattern.test(run.headSha ?? "") ||
    manifest.event !== run.event ||
    manifest.sha !== run.headSha
  )
    throw new Error("Artifact does not match the successful workflow run");

  if (run.event === "pull_request") {
    const prNumber = Number(run.prNumber);
    if (!Number.isSafeInteger(prNumber) || prNumber < 1 || manifest.pr !== prNumber)
      throw new Error("Artifact does not match the trusted pull request number");
    return prNumber;
  }

  if (run.event === "push") {
    if (manifest.pr !== null || run.repository !== run.headRepository)
      throw new Error("Invalid production artifact metadata");
    return null;
  }

  throw new Error("Unsupported event type");
}
