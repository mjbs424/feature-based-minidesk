import path from "node:path";
import { pathToFileURL } from "node:url";
import { secureBuildOutputConfig } from "./build-output-config.mjs";

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

function redirectTarget(location, url, expectedPathname) {
  const nextUrl = new URL(location, url);
  if (expectedPathname !== undefined && nextUrl.pathname !== expectedPathname)
    throw new Error("Deployment redirected to a different path");
  return nextUrl;
}

async function requestOnOrigin(url, origin, secret, request, expectedPathname) {
  for (let redirects = 0; redirects < 4; redirects++) {
    if (url.origin !== origin) throw new Error("Deployment redirected outside its origin");
    const response = await request(url, {
      redirect: "manual",
      headers: secret ? { "x-vercel-protection-bypass": secret } : {},
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Deployment redirect has no location");
      url = redirectTarget(location, url, expectedPathname);
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
  return asset.pathname.endsWith(".js") ? response.text() : response.arrayBuffer();
}

function referencedBuildAssets(javascript, base) {
  return [
    ...javascript.matchAll(/["'`]((?:\.\/|\/)?(?:assets\/)?[A-Za-z0-9_-]+\.(?:js|css))["'`]/g),
  ].map(
    ([, reference]) => new URL(reference.startsWith("assets/") ? `/${reference}` : reference, base),
  );
}

function checkSecurityHeaders(response, pathname) {
  for (const [name, expected] of Object.entries(secureBuildOutputConfig.routes[0].headers)) {
    if (response.headers.get(name) !== expected) {
      throw new Error(`Missing or changed security header on ${pathname}: ${name}`);
    }
  }
}

async function checkBuildAssets(html, url, secret, request) {
  const assets = [...html.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/gi)].map(
    (match) => new URL(match[1], url),
  );
  if (
    !assets.some((asset) => asset.pathname.endsWith(".js")) ||
    !assets.some((asset) => asset.pathname.endsWith(".css"))
  )
    throw new Error("Deployment page has no built JavaScript or stylesheet");
  const checked = new Set();
  const queue = [...assets];
  while (queue.length) {
    if (checked.size > 50) throw new Error("Too many build assets in deployment smoke test");
    const asset = queue.shift();
    if (checked.has(asset.href)) continue;
    checked.add(asset.href);
    const body = await checkAsset(asset, url.origin, secret, request);
    if (asset.pathname.endsWith(".js")) queue.push(...referencedBuildAssets(body, asset));
  }
  return checked.size;
}

async function checkDeepLink(url, secret, request) {
  const deepLink = new URL("/unknown-page", url);
  const deepResponse = await requestOnOrigin(
    deepLink,
    url.origin,
    secret,
    request,
    deepLink.pathname,
  );
  if (
    !/^text\/html\b/i.test(deepResponse.headers.get("content-type") ?? "") ||
    !/<div\s+id=["']root["']\s*><\/div>/i.test(await deepResponse.text())
  )
    throw new Error("Deep link did not return the application page");
  checkSecurityHeaders(deepResponse, deepLink.pathname);
}

async function checkStaticIcon(url, secret, request) {
  const icon = new URL("/favicon.svg", url);
  const iconResponse = await requestOnOrigin(icon, url.origin, secret, request);
  if (
    !/^image\/svg\+xml\b/i.test(iconResponse.headers.get("content-type") ?? "") ||
    !(await iconResponse.text()).includes("<svg")
  )
    throw new Error("Static icon was not served as SVG");
  checkSecurityHeaders(iconResponse, icon.pathname);
}

function isValidMiniDeskDemo(body) {
  const serverNow = Date.parse(body?.serverNow);
  const resetAt = Date.parse(body?.resetAt);
  return [
    typeof body?.datasetId === "string",
    body?.currency === "USD",
    body?.timeZone === "UTC",
    Number.isFinite(serverNow),
    Number.isFinite(resetAt),
    resetAt > serverNow,
  ].every(Boolean);
}

async function checkMiniDeskApi(url, secret, request) {
  const endpoint = new URL("/api/minidesk/v1/demo", url);
  const response = await requestOnOrigin(endpoint, url.origin, secret, request);
  if (
    !/^application\/json\b/i.test(response.headers.get("content-type") ?? "") ||
    response.headers.get("cache-control") !== "no-store"
  )
    throw new Error("MiniDesk API returned unexpected headers");
  const body = await response.json();
  if (!isValidMiniDeskDemo(body)) throw new Error("MiniDesk API returned an invalid demo response");
  checkSecurityHeaders(response, endpoint.pathname);
}

export async function smokeDeployment(value, secret, request = fetch) {
  const url = deploymentOrigin(value);
  const response = await requestOnOrigin(url, url.origin, secret, request, url.pathname);
  const html = await response.text();
  if (
    !/^text\/html\b/i.test(response.headers.get("content-type") ?? "") ||
    !/<div\s+id=["']root["']\s*><\/div>/i.test(html)
  )
    throw new Error("Deployment did not return the application page");
  const assetCount = await checkBuildAssets(html, url, secret, request);
  checkSecurityHeaders(response, "/");
  await checkDeepLink(url, secret, request);
  await checkStaticIcon(url, secret, request);
  await checkMiniDeskApi(url, secret, request);
  console.log(
    `Smoke test passed: application page, deep link, static icon, MiniDesk API and ${assetCount} assets`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await smokeDeployment(
    smokeTarget(process.env.RUN_EVENT, process.env.DEPLOYMENT_URL),
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  );
}
