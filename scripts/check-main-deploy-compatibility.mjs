import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const trustedRef = process.argv[2] ?? "origin/main";
const source = execFileSync(
  "git",
  ["show", `${trustedRef}:.github/scripts/build-output-config.mjs`],
  { encoding: "utf8" },
);
const directory = await mkdtemp(path.join(os.tmpdir(), "minidesk-main-validator-"));
try {
  const file = path.join(directory, "build-output-config.mjs");
  await writeFile(file, source);
  const { assertTrustedBuildOutputConfig } = await import(pathToFileURL(file).href);
  const config = JSON.parse(await readFile("bundle/.vercel/output/config.json", "utf8"));
  let kind;
  try {
    kind = assertTrustedBuildOutputConfig(config) ?? "static";
  } catch {
    throw new Error(
      "The trusted deploy validator on main does not accept this artifact. Merge the deployment compatibility update into main before deploying the MiniDesk Function.",
    );
  }
  const expected = config.routes.some((route) => route.dest?.startsWith("/api/minidesk/v1?"))
    ? "minidesk"
    : "static";
  if (kind !== expected)
    throw new Error(`The trusted deploy validator on main classified the artifact as ${kind}`);
  console.log(`Trusted main deploy validator accepts ${kind} build output`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
