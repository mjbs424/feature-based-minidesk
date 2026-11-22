# Modern Web Guidance in MiniDesk

This guide owns the project's browser-feature target and the use of the installed [Modern Web Guidance skill](../.agents/skills/modern-web-guidance/SKILL.md). It complements the product, design, architecture, and development guides; those documents own MiniDesk's behavior, components, boundaries, and checks.

## Browser-feature target

The approved target is **Baseline Widely available**. A web feature reaches this status after it has been interoperable in the major browser engines for at least 30 months. This is a moving compatibility target, not a fixed list of browser versions or a guarantee that an implementation is accessible or correct. Check the current Baseline and browser support data for any feature whose support matters to a change.

Use a Widely available feature without a compatibility fallback when its behavior fits the product. For a Newly available or Limited availability feature, follow the retrieved guide's fallback or progressive-enhancement advice and verify the experience in the browsers the product supports. Add a polyfill only when the feature needs one, load it conditionally, and review its size and maintenance cost. Do not enable volatile-feature or origin-trial guidance by default. The product has not yet defined a browser-version support matrix; settle that with real user requirements when it becomes necessary.

## Using guidance during frontend work

1. For a web UI, HTML, CSS, accessibility, performance, or client-side browser API task, read the installed skill. Search for the specific capability using a short English query, then retrieve the relevant guide IDs. On this pnpm project and on Windows, set `$env:DISABLE_TELEMETRY='1'` in PowerShell before running `pnpx.cmd modern-web-guidance@1.0.1 search "<query>"` or `pnpx.cmd modern-web-guidance@1.0.1 retrieve "<id>"`. Keep this opt-out for all repository CLI use: upstream [collects CLI search queries](https://github.com/GoogleChrome/modern-web-guidance#telemetry--privacy). Scope command approvals to version 1.0.1 as well; the vendored skill's `@latest` examples do not change this project rule.
2. Compare the retrieved advice with the approved feature behavior, shadcn/ui component contract where used, and the project's design and architecture rules. Do not add a browser API, polyfill, or dependency merely because it appears in a guide.
3. Verify the resulting behavior with the relevant local checks and, for interactive UI, browser evidence covering keyboard and focus behavior, responsive layout, reduced motion when relevant, and any fallback actually used. Baseline compatibility and a passing build do not establish these outcomes.

The skill's source is the [GoogleChrome repository](https://github.com/GoogleChrome/modern-web-guidance). The repository-local `skills-lock.json` records the installed source commit; the CLI version used for this setup is 1.0.1. Review upstream changes before refreshing the skill or CLI rather than silently changing guidance during a task.
The optional `--skill-version` argument in upstream examples supplies update notices and telemetry metadata; it does not select the CLI's guide catalog. The pinned CLI version controls that catalog.
The vendored skill files are excluded from Oxfmt through `fmt.ignorePatterns` in `vite.config.ts` so an update does not rewrite upstream content; project-authored files still follow the normal formatting checks.
Two public WebCrypto API examples in the vendored encryption guide match Gitleaks' generic key rule. `.gitleaksignore` exempts only those two file/line findings; review the fingerprints again whenever the skill is updated.

## Legacy-pattern audit and modernization

Run `pnpx.cmd modern-web-guidance@1.0.1 legacy-scan . --json` for an explicit repository-wide modernization audit, or point it at the requested directory. The scan is advisory. For each result, inspect the surrounding code and its `keepWhen` / `dropWhen` criteria; exclude intentional fallbacks, guarded code, vendor code, and lookalikes. Retrieve the cited guide for verified findings, propose a scoped change, then preserve behavior and recheck the changed files. A zero-finding scan does not prove the codebase is modern: the scanner covers only a subset of the guidance catalog. There is no automatic bulk fix or required CI gate for this scan.

On 22 November 2026, CLI 1.0.1 returned **zero findings** for `src` and for the repository root, with 52 active rules across 38 guides. The root scan skipped eight documentation or test files. No source modernization was justified by those results.

## Evaluating value in MiniDesk

The published [MWG evaluations](https://developer.chrome.com/docs/modern-web-guidance/get-started) measure guided versus unguided agents on their own tasks; they do not measure MiniDesk. When a real UI task is ready, compare two equivalent implementations with and without the skill using the same requirements, model, browser targets, and time budget. Record correctness, accessibility and keyboard behavior, browser compatibility, tests, Lighthouse where applicable, time spent, review corrections, and guide advice that did not fit. Keep the result linked to that task before deciding whether to broaden use or add automation. The existing [development checks](development.md) remain the project gates.
