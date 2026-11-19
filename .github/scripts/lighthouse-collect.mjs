import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function validatePreview(previewUrl, secret) {
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(previewUrl) || !secret)
    throw new Error("Preview URL and automation bypass secret are required");
}

export async function bootstrapBypassCookie(previewUrl, secret, request = fetch) {
  validatePreview(previewUrl, secret);
  const response = await request(previewUrl, {
    headers: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
    redirect: "manual",
  });
  if (response.status < 200 || response.status >= 400)
    throw new Error("Vercel did not issue an automation bypass cookie");
  const entry = response.headers.getSetCookie().find((value) => /^_vercel_jwt=[^;]+/.test(value));
  if (!entry) throw new Error("Vercel did not issue an automation bypass cookie");
  return { name: "_vercel_jwt", value: entry.slice("_vercel_jwt=".length).split(";", 1)[0] };
}

export function collectConfig(previewUrl) {
  validatePreview(previewUrl, "configured");
  return {
    ci: {
      collect: {
        url: [previewUrl],
        numberOfRuns: 3,
        puppeteerScript: fileURLToPath(new URL("./lighthouse-cookie.cjs", import.meta.url)),
        puppeteerLaunchOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
        settings: {
          chromeFlags: "--no-sandbox",
          disableStorageReset: true,
        },
      },
    },
  };
}

export function redactReport(text, credentials) {
  return credentials.reduce(
    (redacted, value) =>
      redacted.replaceAll(value, "[REDACTED]").replaceAll(encodeURIComponent(value), "[REDACTED]"),
    text,
  );
}

async function main() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const previewUrl = process.env.PREVIEW_URL;
  const cookie = await bootstrapBypassCookie(previewUrl, secret);
  const config = collectConfig(previewUrl);
  const directory = await mkdtemp(path.join(os.tmpdir(), "minidesk-lighthouse-"));
  try {
    const configPath = path.join(directory, "lighthouserc.json");
    await writeFile(configPath, JSON.stringify(config));
    const childEnv = { ...process.env, VERCEL_PREVIEW_COOKIE: JSON.stringify(cookie) };
    delete childEnv.VERCEL_AUTOMATION_BYPASS_SECRET;
    const result = spawnSync("lhci", ["collect", `--config=${configPath}`], {
      stdio: "inherit",
      env: childEnv,
    });
    const reports = await readdir(".lighthouseci").catch(() => []);
    for (const name of reports) {
      const file = path.join(".lighthouseci", name);
      if (!/\.(json|html)$/i.test(name)) continue;
      await writeFile(file, redactReport(await readFile(file, "utf8"), [secret, cookie.value]));
    }
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Lighthouse collection failed");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
