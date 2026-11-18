import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyAudit,
  parseAuditResult,
  reportAudit,
} from "../.github/scripts/security-audit.mjs";

const advisory = (name, severity = "high") => ({
  module_name: name,
  severity,
  title: `${name} vulnerability`,
  url: `https://github.com/advisories/${name}`,
  patched_versions: null,
});
const report = (...entries) => ({
  advisories: Object.fromEntries(entries.map((entry, index) => [index, entry])),
  metadata: { vulnerabilities: { high: entries.length } },
});

test("a named package is reported but does not block the audit", () => {
  const exceptions = { picomatch: "No patch yet" };
  const result = classifyAudit(report(advisory("picomatch")), exceptions);
  assert.equal(result.allowed.length, 1);
  assert.equal(result.blocked.length, 0);
  assert.equal(reportAudit(report(advisory("picomatch")), exceptions), 0);
});

test("a different high or critical advisory blocks the audit", () => {
  const exceptions = { picomatch: "No patch yet" };
  const result = classifyAudit(
    report(advisory("picomatch"), advisory("other", "critical")),
    exceptions,
  );
  assert.deepEqual(
    result.blocked.map((entry) => entry.module_name),
    ["other"],
  );
  assert.equal(reportAudit(report(advisory("other", "critical")), exceptions), 1);
});

test("an invalid report or exception list fails closed", () => {
  assert.throws(() => classifyAudit({}, {}), /Unexpected pnpm audit report/);
  assert.throws(() => classifyAudit(report(), { picomatch: "" }), /Invalid audit exception/);
  assert.throws(
    () => classifyAudit(report({ severity: "high" }), {}),
    /Unexpected pnpm audit advisory/,
  );
});

test("registry and pnpm errors fail closed rather than passing as clean scans", () => {
  assert.throws(
    () => parseAuditResult({ status: 1, stdout: "registry error" }),
    /did not return JSON/,
  );
  assert.throws(
    () => parseAuditResult({ status: 1, stdout: JSON.stringify(report()) }),
    /failed without reporting an advisory/,
  );
  assert.throws(
    () => parseAuditResult({ status: 2, stdout: JSON.stringify(report()) }),
    /exited with 2/,
  );
});
