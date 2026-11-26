// The deploy workflow runs this code from main, never from the PR artifact.
// Approval is an exact issue comment by a current repository writer for this SHA.
async function isWriterApproval(github, comment, approval) {
  if (comment.body?.trim() !== approval || comment.user?.type !== "User") return false;
  const login = comment.user.login;
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login)) return false;
  let access;
  try {
    access = await github(`/collaborators/${encodeURIComponent(login)}/permission`);
  } catch (error) {
    // Non-collaborators can copy the exact comment; GitHub returns 404.
    if (String(error).endsWith(": 404")) return false;
    throw error;
  }
  return ["admin", "maintain", "write"].includes(access.permission);
}

export async function authorizePreviewDeployment(github, prNumber, sha) {
  const approval = `/approve-preview ${sha}`;
  for (let page = 1; page <= 20; page++) {
    const comments = await github(`/issues/${prNumber}/comments?per_page=100&page=${page}`);
    for (const comment of comments) {
      if (await isWriterApproval(github, comment, approval)) return;
    }
    if (comments.length < 100) break;
  }
  throw new Error(`Preview Function requires a repository writer to comment: ${approval}`);
}
