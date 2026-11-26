import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in .env.local");
await mkdir(".local-tools", { recursive: true });
await build({
  entryPoints: ["api/minidesk/v1.ts"],
  outfile: ".local-tools/minidesk-handler.cjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
});
const require = createRequire(import.meta.url);
const handler = require("../.local-tools/minidesk-handler.cjs").default;
const server = createServer(handler);
server.listen(3100, "127.0.0.1", () => {
  console.log("MiniDesk API ready at http://127.0.0.1:3100/api/minidesk/v1/demo");
});
