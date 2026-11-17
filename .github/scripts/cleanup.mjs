const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PREVIEW_PROJECT_ID;
const orgId = process.env.VERCEL_ORG_ID;

if (!token || !/^prj_[\w]+$/.test(projectId ?? "") || !orgId) {
  throw new Error("Preview Vercel credentials or project ID are missing");
}

function vercelUrl(path) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (orgId.startsWith("team_")) url.searchParams.set("teamId", orgId);
  return url;
}

export async function vercel(path, method = "GET") {
  const url = vercelUrl(path);
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  assertVercelResponse(response, method, url);
  return readVercelResponse(response, method);
}

function assertVercelResponse(response, method, url) {
  if (response.ok) return;
  if (method === "DELETE" && response.status === 404) return;
  throw new Error(`Vercel API ${method} ${url.pathname}: ${response.status}`);
}

function readVercelResponse(response, method) {
  if (method === "GET") return response.json();
  return null;
}

async function* deployments() {
  let until;
  let pages = 0;
  while (true) {
    const page = await vercel(`/v6/deployments?${deploymentQuery(until)}`);
    yield* page.deployments ?? [];
    until = page.pagination?.next;
    if (++pages > 100) throw new Error("Deployment pagination exceeded 100 pages");
    if (!until) break;
  }
}

function deploymentQuery(until) {
  const query = new URLSearchParams({ projectId, limit: "100" });
  if (until) query.set("until", String(until));
  return query;
}

async function removeDeployment(item, pr) {
  // Verify project and metadata on the individual deployment before deletion.
  const route = `/v13/deployments/${encodeURIComponent(item.uid)}`;
  const detail = await vercel(route);
  if (detail.projectId !== projectId || detail.meta?.minideskPr !== String(pr)) {
    throw new Error(`Deployment ${item.uid} failed project/PR verification`);
  }
  await vercel(route, "DELETE");
  console.log(`Removed preview ${item.uid} for PR #${pr}`);
}

export async function removePrDeployments(pr, keepId = null) {
  validatePrNumber(pr);
  for await (const item of deployments()) {
    if (item.meta?.minideskPr === String(pr) && item.uid !== keepId) {
      await removeDeployment(item, pr);
    }
  }
}

function validatePrNumber(pr) {
  if (!Number.isSafeInteger(Number(pr)) || Number(pr) < 1) throw new Error("Invalid PR number");
}

if (process.argv[1]?.endsWith("cleanup.mjs")) {
  await removePrDeployments(process.env.PR_NUMBER);
}
