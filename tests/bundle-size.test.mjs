import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { measureBundles, stableName } from "../.github/scripts/bundle-size.mjs";

test("checks every nested JS/CSS asset independently and supports stable-name exceptions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bundle-size-"));
  try {
    await mkdir(path.join(root, "assets"));
    await writeFile(path.join(root, "assets", "main-AbCd1234.js"), "main");
    await writeFile(path.join(root, "assets", "route-XyZ98765.js"), "route");
    await writeFile(path.join(root, "assets", "style-XyZ98765.css"), "style");
    const calculate = async (_plugin, { checks }) =>
      checks.map(({ files }) => ({
        size: path.basename(files[0]).startsWith("route") ? 250_000 : 100_000,
      }));
    const config = { defaultLimitKB: 200, overrides: {} };
    const rows = await measureBundles(root, config, calculate);
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.filter((row) => !row.passed).map((row) => row.key),
      ["assets/route.js"],
    );
    config.overrides["assets/route.js"] = 300;
    assert.ok((await measureBundles(root, config, calculate)).every((row) => row.passed));
    config.overrides["assets/old.js"] = 300;
    await assert.rejects(measureBundles(root, config, calculate), /Unused bundle size exception/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("real Size Limit file plugin measures the built file with Brotli", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bundle-size-"));
  try {
    await writeFile(path.join(root, "entry-AbCd1234.js"), "x".repeat(200_000));
    const rows = await measureBundles(root, { defaultLimitKB: 1, overrides: {} });
    assert.equal(rows.length, 1);
    assert.ok(rows[0].passed);
    assert.equal(stableName(rows[0].name), "entry.js");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
