# 0001 — Use Size Limit for built asset budgets

- Status: Accepted
- Recorded: 2026-11-21 (the decision was implemented earlier)

## Context and problem statement

The pull request build needs a measurable budget for the JavaScript and CSS files it produces. A report alone would show growth but would not stop a file from exceeding an agreed limit. The check must use the verified CI build artifact and report a result on the relevant pull request commit.

## Decision drivers

- Measure the compressed size of every built JavaScript and CSS file.
- Allow a default per-file budget and explicit exceptions for files that need a different budget.
- Reuse the verified build and the repository's existing PR status and reporting flow.
- Keep the measurement and policy straightforward to maintain in GitHub Actions.

## Considered options

- **Size Limit** with `@size-limit/file`: measures built files with Brotli and exposes a programmatic result to the existing reporting script.
- **BundleWatch**: also supports file-size budgets and pull request reporting. Its own comparison and reporting workflow is a viable alternative, but the repository already owns the artifact, budget policy, and PR status flow that this check needs.

No comparative benchmark or trial of BundleWatch was recorded for this project. The choice reflects the required integration and the implemented workflow, not a claim that BundleWatch cannot meet these requirements.

## Decision outcome

Use Size Limit and `@size-limit/file` to measure each built `.js` and `.css` file from the verified artifact with Brotli compression. The repository script applies the budget in `.github/bundle-size.json`, publishes a per-file PR report, and sets a failing status when a file exceeds its limit. The current policy is 20 kB per file by default and 200 kB for `assets/index.js`; these values are configuration, not a permanent part of the tool choice.

This fits the existing CI flow without adding another reporting system. Popularity was a secondary signal: GitHub pages checked while recording this decision on 2026-11-21 displayed approximately 7.1k stars and 1.7k forks for [Size Limit](https://github.com/ai/size-limit), versus 445 stars and 46 forks for [BundleWatch](https://github.com/bundlewatch/bundlewatch). These changing counts do not establish technical superiority or predict maintenance quality. Comparable direct download figures were not verified, so they are omitted.

## Consequences

- A growing file can fail the pull request even when the overall application still performs well; budget changes need review against what users actually download.
- The custom script and status publishing code remain this repository's maintenance responsibility.
- The check covers built JavaScript and CSS files, not static images, other assets, network behavior, or interaction time. Lighthouse and later route-level measurements provide different evidence.
- If the app gains multiple routes or entry points, revisit whether per-file budgets alone express the intended user-facing performance budget.
