const shaPattern = /^[a-f0-9]{40}$/;

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
