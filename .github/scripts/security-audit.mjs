import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exceptionsUrl = new URL("../audit-exceptions.json", import.meta.url);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateExceptions(exceptions) {
  if (!isRecord(exceptions)) {
    throw new Error("Audit exceptions must be an object of package names and reasons");
  }
  for (const [name, reason] of Object.entries(exceptions)) {
    if (
      !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name) ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      throw new Error(`Invalid audit exception: ${name}`);
    }
  }
}

function validateReport(report) {
  if (
    !isRecord(report) ||
    !isRecord(report.advisories) ||
    !isRecord(report.metadata?.vulnerabilities)
  ) {
    throw new Error("Unexpected pnpm audit report format");
  }
}

function validateAdvisory(advisory) {
  if (
    !isRecord(advisory) ||
    typeof advisory.module_name !== "string" ||
    !["high", "critical"].includes(advisory.severity)
  ) {
    throw new Error("Unexpected pnpm audit advisory format");
  }
}

export function classifyAudit(report, exceptions) {
  validateExceptions(exceptions);
  validateReport(report);

  const allowed = [];
  const blocked = [];
  for (const advisory of Object.values(report.advisories)) {
    validateAdvisory(advisory);
    const exempted = Object.hasOwn(exceptions, advisory.module_name);
    const entry = { ...advisory, reason: exempted ? exceptions[advisory.module_name] : undefined };
    (exempted ? allowed : blocked).push(entry);
  }
  return { allowed, blocked };
}

function showAdvisory(advisory, label) {
  console.log(`${label} ${advisory.module_name} (${advisory.severity}): ${advisory.title}`);
  console.log(`  ${advisory.url || advisory.github_advisory_id || "No advisory URL"}`);
  if (advisory.reason) console.log(`  Temporary exception: ${advisory.reason}`);
  if (advisory.reason && advisory.patched_versions) {
    console.log(`  Review exception: a patch is reported (${advisory.patched_versions})`);
  }
}

export function parseAuditResult(result) {
  if (result.error) throw result.error;
  if (result.stderr) process.stderr.write(result.stderr);
  if (![0, 1].includes(result.status)) throw new Error(`pnpm audit exited with ${result.status}`);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error("pnpm audit did not return JSON; check the pnpm version and registry access");
  }
  validateReport(report);
  if (result.status === 1 && !Object.keys(report.advisories).length) {
    throw new Error("pnpm audit failed without reporting an advisory");
  }
  return report;
}

function runPnpmAudit() {
  const windows = process.platform === "win32";
  const command = windows ? process.env.ComSpec || "cmd.exe" : "pnpm";
  const args = windows
    ? ["/d", "/s", "/c", "pnpm audit --json --audit-level high"]
    : ["audit", "--json", "--audit-level", "high"];
  return parseAuditResult(
    spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }),
  );
}

export function reportAudit(report, exceptions) {
  const { allowed, blocked } = classifyAudit(report, exceptions);
  for (const advisory of allowed) showAdvisory(advisory, "WARN (allowed)");
  for (const advisory of blocked) showAdvisory(advisory, "ERROR (blocks commit/merge)");
  if (!allowed.length && !blocked.length)
    console.log("No high or critical dependency advisories found");
  return blocked.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const exceptions = JSON.parse(readFileSync(exceptionsUrl, "utf8"));
    process.exitCode = reportAudit(runPnpmAudit(), exceptions);
  } catch (error) {
    console.error(`Dependency audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}
