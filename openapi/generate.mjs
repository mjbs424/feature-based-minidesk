import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@hey-api/openapi-ts";
import { parse } from "yaml";

// Resolve inputs and outputs relative to this script, not the caller's directory.
const root = new URL("../", import.meta.url);
const schemaFile = new URL("./minidesk.v1.json", import.meta.url);
const clientDir = fileURLToPath(new URL("../src/shared/api/generated/", import.meta.url));
const features = ["core", "tasks", "expenses", "focus", "rum"];

// Core owns shared OpenAPI fields; each feature adds its paths and schemas.
const fragments = await Promise.all(
  features.map(async (feature) =>
    parse(await readFile(new URL(`./source/${feature}.yaml`, import.meta.url), "utf8")),
  ),
);
const [core] = fragments;
const schema = {
  ...core,
  paths: {},
  components: { responses: core.components.responses, schemas: {} },
};
for (const [index, fragment] of fragments.entries()) {
  if (
    index &&
    (fragment.openapi || fragment.info || fragment.servers || fragment.components?.responses)
  ) {
    throw new Error(`${features[index]}.yaml contains core-owned OpenAPI fields`);
  }
  for (const [path, methods] of Object.entries(fragment.paths ?? {})) {
    if (schema.paths[path]) throw new Error(`Duplicate path: ${path}`);
    schema.paths[path] = methods;
  }
  for (const [name, definition] of Object.entries(fragment.components?.schemas ?? {})) {
    if (schema.components.schemas[name]) throw new Error(`Duplicate schema: ${name}`);
    schema.components.schemas[name] = definition;
  }
}

// Catch broken local references before handing the merged document to Hey API.
function checkRef(reference) {
  if (!reference.startsWith("#/")) {
    throw new Error(`Unresolved contract reference: ${reference}`);
  }
  reference
    .slice(2)
    .split("/")
    .reduce((target, token) => {
      if (/~(?![01])/.test(token)) throw new Error(`Invalid contract reference: ${reference}`);
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
      if (!Object.hasOwn(Object(target), key)) {
        throw new Error(`Unresolved contract reference: ${reference}`);
      }
      return target[key];
    }, schema);
}

function checkRefs(value) {
  if (!value || typeof value !== "object") return;
  if (typeof value.$ref === "string") checkRef(value.$ref);
  Object.values(value).forEach(checkRefs);
}
checkRefs(schema);

// Use the project's formatter to make the checked-in JSON deterministic.
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("vite-plus/bin")),
    "fmt",
    `--stdin-filepath=${fileURLToPath(schemaFile)}`,
  ],
  { cwd: fileURLToPath(root), input: `${JSON.stringify(schema, null, 2)}\n`, encoding: "utf8" },
);
if (result.status !== 0) throw new Error(result.stderr || "Formatting failed");

// Compare every generated file, including files in nested directories.
async function files(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const name = join(prefix, entry.name);
      return entry.isDirectory() ? files(join(directory, entry.name), name) : [name];
    }),
  );
  return nested.flat().sort();
}

// Check mode generates into a temporary directory; generate mode writes the client in place.
const check = process.argv.includes("--check");
const output = check ? await mkdtemp(join(tmpdir(), "minidesk-hey-check-")) : clientDir;
const normalized = (content) => content.replace(/\r\n/g, "\n");
try {
  await createClient({ input: schema, output });
  if (check) {
    // CI fails if either the standalone OpenAPI JSON or Hey API output has drifted.
    if (normalized(await readFile(schemaFile, "utf8").catch(() => "")) !== result.stdout) {
      throw new Error("OpenAPI JSON is stale; run pnpm run api:generate");
    }
    const expected = await files(output);
    const actual = await files(clientDir).catch(() => []);
    if (
      expected.join("\n") !== actual.join("\n") ||
      (
        await Promise.all(
          expected.map(
            async (name) =>
              normalized(await readFile(join(output, name), "utf8")) ===
              normalized(await readFile(join(clientDir, name), "utf8")),
          ),
        )
      ).includes(false)
    ) {
      throw new Error("Generated API client is stale; run pnpm run api:generate");
    }
  } else {
    await mkdir(dirname(fileURLToPath(schemaFile)), { recursive: true });
    await writeFile(schemaFile, result.stdout);
  }
} finally {
  if (check) await rm(output, { recursive: true, force: true });
}
