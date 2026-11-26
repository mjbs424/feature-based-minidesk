import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { secureBuildOutputConfig } from "../.github/scripts/build-output-config.mjs";

const output = "bundle/.vercel/output";
const func = `${output}/functions/api/minidesk/v1.func`;
await rm(output, { recursive: true, force: true });
await mkdir(`${output}/static`, { recursive: true });
await mkdir(func, { recursive: true });
await cp("dist", `${output}/static`, { recursive: true });
await build({
  entryPoints: ["api/minidesk/v1.ts"],
  outfile: `${func}/handler.cjs`,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  minify: false,
  legalComments: "none",
});
await writeFile(
  `${func}/.vc-config.json`,
  `${JSON.stringify({ runtime: "nodejs24.x", handler: "handler.cjs", launcherType: "Nodejs", shouldAddHelpers: false })}\n`,
);
await writeFile(`${output}/config.json`, `${JSON.stringify(secureBuildOutputConfig)}\n`);
const stat = await readFile(`${func}/handler.cjs`);
if (stat.length > 5_000_000) throw new Error("MiniDesk function bundle is unexpectedly large");
console.log(`Packaged MiniDesk Function (${stat.length} bytes) and static frontend`);
