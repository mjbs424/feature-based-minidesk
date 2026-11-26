# Development and contributing

This guide owns development commands, check coverage, CI, and deployment. For any first-time installation, use the single [setup guide](agent-tooling-setup.md). See [agent-workflow.md](agent-workflow.md) for task review and PR readiness.

## Checks and scripts

| Command                                   | Purpose                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `vp dev`                                  | Start the development server.                                                            |
| `pnpm run dev:api`                        | Start the MiniDesk API locally with `.env.local`.                                        |
| `pnpm run db:migrate`                     | Apply versioned MiniDesk relational migrations using the direct database URL.            |
| `pnpm run package:vercel`                 | Package the built frontend and MiniDesk Function for Vercel.                             |
| `vp check`                                | Check formatting, lint, and types across the project.                                    |
| `vp run test`                             | Run the current Node tests from the project script.                                      |
| `vp run build`                            | Type-check and build; locally open a bundle analysis report after the build.             |
| `vp run audit`                            | Run the configured Fallow audit.                                                         |
| `vp run doctor`                           | Run React Doctor.                                                                        |
| `node .github/scripts/security-audit.mjs` | Check high and critical dependency advisories against the repository's exception policy. |
| `vp run preview`                          | Preview a local production build.                                                        |

`vp run audit` and `security-audit.mjs` serve different purposes. The security script reads the `pnpm audit` report and the exception map. `vp test` is Vite+'s built-in test command, not the current `node --test` script. Use `vp run test`. The UI testing level and framework are not yet chosen. Likewise, use `vp run build` to include the project's TypeScript build step. CI currently invokes equivalent pnpm commands from its workflow; this guide uses `vp` for local development.

Local builds open `.bundle-analysis/report.html` with an interactive view of the built modules and chunks, including gzip and Brotli sizes. The report is ignored by Git and is outside `dist`, so it is not deployed. CI and Vercel builds do not run the analyzer; the existing bundle-size check remains the deployment budget gate.

When a script or command changes, audit this command list and the affected check coverage in the same PR.

## Check coverage

For full local verification, run `vp check`, `vp run test`, `vp run build`, `vp run audit`, and `vp run doctor`. Run the security audit script when dependencies change. Inspect reports; Fallow's configured audit does not automatically gate every kind of finding.

The bundle-size check measures built JavaScript and CSS, not every static asset. The current Lighthouse check visits only the root To-do route, so it does not establish performance coverage for the other feature routes. Interpret both reports within these limits.

The deployment smoke test requests `/`, an unknown deep link, `/favicon.svg`, `/api/minidesk/v1/demo`, and the entry JavaScript and CSS. It follows local JS/CSS references in built JavaScript to check route chunks too. It checks the API's clock/generation shape and no-store header, plus content types and security headers; browser rendering of the 404 page still needs a separate check.

The rationale for the Size Limit file-budget check is recorded in [ADR 0001](decisions/0001-use-size-limit-for-built-asset-budgets.md).

Fallow ignores the TypeScript import resolver's unused-dependency warning because Oxlint loads that package by its `typescript` resolver name from configuration.

The pre-commit hook runs React Doctor on staged files, `vp staged --hide-unstaged`, Gitleaks on staged files, Semgrep on `src` and `.github/scripts`, Fallow, and the dependency security check. It verifies the staged file set again after `vp staged`. A missing required tool or failed check blocks the commit. Semgrep uses `p/javascript` rules from the registry and needs network access when those rules are not cached. The hook does not run `pnpm test`; CI runs it. For tool installation, use the [setup guide](agent-tooling-setup.md).

## CI and deployment

CI runs for pull requests and pushes to `main`. It installs from the lockfile, runs Gitleaks, the dependency security audit, `vp check`, tests, Fallow, React Doctor, and the build. The verified build is uploaded as an artifact; the deployment workflow uses that artifact rather than rebuilding pull request code.

The deployment workflow checks out trusted `main` code, including its artifact validator. CI checks each packaged artifact against that validator before upload. A new Build Output shape must first land as a backward-compatible validator change on `main`; keep the existing static shape deployable during that transition. This prevents a PR from producing a bundle that the trusted Preview or production deployment cannot accept.

Pull requests deploy the artifact to an isolated Vercel Preview. A PR artifact containing a Function requires a repository writer's exact `/approve-preview <40-character-commit-SHA>` comment on that PR. The trusted `main` deploy script verifies the writer's current repository permission and the PR commit before using Preview credentials; each new commit needs a new comment. If approval arrives after a deploy run fails, rerun that deploy workflow for the same commit. The workflow smoke-tests the deployment and reports Preview status, bundle size, and Lighthouse results. After merge, a push to `main` follows the same build and checks before production deployment. Check the deployment URL and status in GitHub Actions and the pull request.

## Dependency exceptions and security findings

`.github/audit-exceptions.json` maps package names to temporary reasons and is currently empty. Add an exception only after reviewing the specific advisory and documenting the reason. Because exceptions are keyed by package name, each one applies to every high or critical advisory for that package, including advisories discovered later. Reviewers must monitor all advisories for excepted packages. An unexcepted high or critical advisory blocks the check; an excepted one remains a warning. The security script also highlights an available patch. Remove exceptions after fixing the affected dependency.

Dependency Review is report-only. For a real leaked secret, revoke or rotate it and address its presence in Git history. CodeQL runs on pull requests and `main`. Later security decisions tracked in T21 and T26 are outside this guide's current workflow.
