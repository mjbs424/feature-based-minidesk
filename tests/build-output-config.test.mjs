import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTrustedBuildOutputConfig,
  secureBuildOutputConfig,
} from "../.github/scripts/build-output-config.mjs";

test("rejects the old build output without security headers", () => {
  assert.throws(() => assertTrustedBuildOutputConfig({ version: 3 }), /Unexpected build output/);
});

test("accepts only the intended security headers on the new build output", () => {
  assert.doesNotThrow(() => assertTrustedBuildOutputConfig(secureBuildOutputConfig));

  const altered = structuredClone(secureBuildOutputConfig);
  altered.routes[0].headers["Content-Security-Policy"] = "default-src *";
  assert.throws(() => assertTrustedBuildOutputConfig(altered), /Unexpected build output/);
});

test("rejects artifact routes that could serve a different destination", () => {
  const altered = structuredClone(secureBuildOutputConfig);
  altered.routes[2].dest = "https://example.com";
  assert.throws(() => assertTrustedBuildOutputConfig(altered), /Unexpected build output/);
});

test("routes MiniDesk API before the filesystem and SPA fallback", () => {
  assert.deepEqual(secureBuildOutputConfig.routes.slice(1), [
    { src: "^/api/minidesk/v1/(.*)$", dest: "/api/minidesk/v1?__route=$1" },
    { src: "^/api/.*$", status: 404 },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ]);
  assert.doesNotThrow(() => assertTrustedBuildOutputConfig(secureBuildOutputConfig));
  assert.doesNotThrow(() =>
    assertTrustedBuildOutputConfig({
      ...secureBuildOutputConfig,
      routes: secureBuildOutputConfig.routes.slice(0, 1),
    }),
  );

  const reordered = structuredClone(secureBuildOutputConfig);
  reordered.routes.reverse();
  assert.throws(() => assertTrustedBuildOutputConfig(reordered), /Unexpected build output/);
});
