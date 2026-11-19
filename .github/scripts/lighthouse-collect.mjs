import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function collectConfig(previewUrl, bypassSecret) {
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(previewUrl) || !bypassSecret)
    throw new Error("Preview URL and automation bypass secret are required");
  return {
    ci: {
      collect: {
        url: [previewUrl],
        numberOfRuns: 3,
        settings: {
          chromeFlags: "--no-sandbox",
          extraHeaders: JSON.stringify({
            "x-vercel-protection-bypass": bypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          }),
        },
      },
    },
  };
}

export function redactReport(text, secret) {
  return text.replaceAll(secret, "[REDACTED]").replaceAll(encodeURIComponent(secret), "[REDACTED]");
}

async function main() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const config = collectConfig(process.env.PREVIEW_URL, secret);
  const directory = await mkdtemp(path.join(os.tmpdir(), "minidesk-lighthouse-"));
  try {
    const configPath = path.join(directory, "lighthouserc.json");
    await writeFile(configPath, JSON.stringify(config));
    const result = spawnSync("lhci", ["collect", `--config=${configPath}`], { stdio: "inherit" });
    const reports = await readdir(".lighthouseci").catch(() => []);
    for (const name of reports) {
      const file = path.join(".lighthouseci", name);
      if (!/\.(json|html)$/i.test(name)) continue;
      await writeFile(file, redactReport(await readFile(file, "utf8"), secret));
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
