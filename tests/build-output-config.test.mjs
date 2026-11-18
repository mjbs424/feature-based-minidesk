import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTrustedBuildOutputConfig,
  secureBuildOutputConfig,
} from "../.github/scripts/build-output-config.mjs";

test("accepts the existing build output while the deployment transition is in progress", () => {
  assert.doesNotThrow(() => assertTrustedBuildOutputConfig({ version: 3 }));
});

test("accepts only the intended security headers on the new build output", () => {
  assert.doesNotThrow(() => assertTrustedBuildOutputConfig(secureBuildOutputConfig));

  const altered = structuredClone(secureBuildOutputConfig);
  altered.routes[0].headers["Content-Security-Policy"] = "default-src *";
  assert.throws(() => assertTrustedBuildOutputConfig(altered), /Unexpected build output/);
});

test("rejects artifact routes that could serve a different destination", () => {
  const altered = structuredClone(secureBuildOutputConfig);
  altered.routes[0].dest = "https://example.com";
  assert.throws(() => assertTrustedBuildOutputConfig(altered), /Unexpected build output/);
});
