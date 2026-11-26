import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTrustedBuildOutputConfig,
  miniDeskBuildOutputConfig,
  secureBuildOutputConfig,
  staticBuildOutputConfig,
} from "../.github/scripts/build-output-config.mjs";

test("rejects the old build output without security headers", () => {
  assert.throws(() => assertTrustedBuildOutputConfig({ version: 3 }), /Unexpected build output/);
});

test("accepts only the intended security headers on the new build output", () => {
  assert.equal(assertTrustedBuildOutputConfig(miniDeskBuildOutputConfig), "minidesk");

  const altered = structuredClone(miniDeskBuildOutputConfig);
  altered.routes[0].headers["Content-Security-Policy"] = "default-src *";
  assert.throws(() => assertTrustedBuildOutputConfig(altered), /Unexpected build output/);
});

test("accepts the trusted static artifact during deployment migration", () => {
  assert.equal(assertTrustedBuildOutputConfig(staticBuildOutputConfig), "static");
  assert.equal(assertTrustedBuildOutputConfig(secureBuildOutputConfig), "static");
});

test("rejects artifact routes that could serve a different destination", () => {
  const altered = structuredClone(miniDeskBuildOutputConfig);
  altered.routes[2].dest = "https://example.com";
  assert.throws(() => assertTrustedBuildOutputConfig(altered), /Unexpected build output/);
});

test("routes MiniDesk API before the filesystem and SPA fallback", () => {
  assert.deepEqual(miniDeskBuildOutputConfig.routes.slice(1), [
    { src: "^/api/minidesk/v1/(.*)$", dest: "/api/minidesk/v1?__route=$1" },
    { src: "^/api/.*$", status: 404 },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ]);
  assert.doesNotThrow(() => assertTrustedBuildOutputConfig(miniDeskBuildOutputConfig));
  assert.doesNotThrow(() =>
    assertTrustedBuildOutputConfig({
      ...miniDeskBuildOutputConfig,
      routes: miniDeskBuildOutputConfig.routes.slice(0, 1),
    }),
  );

  const reordered = structuredClone(miniDeskBuildOutputConfig);
  reordered.routes.reverse();
  assert.throws(() => assertTrustedBuildOutputConfig(reordered), /Unexpected build output/);
});
