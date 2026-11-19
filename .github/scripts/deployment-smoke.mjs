import path from "node:path";
import { pathToFileURL } from "node:url";

export function smokeTarget(event, deploymentUrl) {
  if (event === "push") return "https://feature-based-minidesk.vercel.app/";
  if (event === "pull_request") return deploymentUrl;
  throw new Error("Unsupported smoke test event");
}

function deploymentOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.vercel\.app$/i.test(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("Invalid deployment URL");
  return url;
}

async function requestOnOrigin(url, origin, secret, request) {
  for (let redirects = 0; redirects < 4; redirects++) {
    if (url.origin !== origin) throw new Error("Deployment redirected outside its origin");
    const response = await request(url, {
      redirect: "manual",
      headers: secret ? { "x-vercel-protection-bypass": secret } : {},
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Deployment redirect has no location");
      url = new URL(location, url);
      continue;
    }
    if (response.status !== 200)
      throw new Error(
        `Deployment returned HTTP ${response.status} at ${url.origin}${url.pathname}`,
      );
    return response;
  }
  throw new Error("Deployment redirected too many times");
}

async function checkAsset(asset, origin, secret, request) {
  const response = await requestOnOrigin(asset, origin, secret, request);
  const contentType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const expected = asset.pathname.endsWith(".css")
    ? ["text/css"]
    : ["text/javascript", "application/javascript"];
  if (!expected.includes(contentType))
    throw new Error(`Unexpected asset content type: ${asset.pathname}`);
  await response.arrayBuffer();
}

export async function smokeDeployment(value, secret, request = fetch) {
  const url = deploymentOrigin(value);
  const response = await requestOnOrigin(url, url.origin, secret, request);
  const html = await response.text();
  if (
    !/^text\/html\b/i.test(response.headers.get("content-type") ?? "") ||
    !/<div\s+id=["']root["']\s*><\/div>/i.test(html)
  )
    throw new Error("Deployment did not return the application page");

  const assets = [...html.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/gi)].map(
    (match) => new URL(match[1], url),
  );
  if (
    !assets.some((asset) => asset.pathname.endsWith(".js")) ||
    !assets.some((asset) => asset.pathname.endsWith(".css"))
  )
    throw new Error("Deployment page has no built JavaScript or stylesheet");
  for (const asset of assets) {
    await checkAsset(asset, url.origin, secret, request);
  }
  console.log(`Smoke test passed: application page and ${assets.length} assets`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await smokeDeployment(
    smokeTarget(process.env.RUN_EVENT, process.env.DEPLOYMENT_URL),
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  );
}
