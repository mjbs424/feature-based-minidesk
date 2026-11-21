# Feature-based MiniDesk

MiniDesk is a small React and TypeScript project with three planned pages: To-do, Expenses, and Focus. These pages give us practical features for exploring a feature-based frontend structure. The repository is still at the foundation stage; the deployed app currently shows a starter page.

The application foundation uses Vite+, React Compiler, Tailwind CSS 4, and shadcn/ui theme tokens. UI components will be added when features need them.

## Why this repository exists

This repository accompanies the [Measure Before You Optimize article](https://www.linkedin.com/pulse/measure-before-you-optimize-roadmap-web-performance-code-jamshidi-5dn4e/). It implements many of the tools discussed in the article so readers can inspect working configurations and adapt useful ideas.

The choices below record what this repository actually runs and where. They are examples, not a prescribed stack. Similar tools can overlap, and a check that helps one team in pre-commit may be too slow there for another team. Choose tools, execution points, baselines, budgets, and merge gates from the needs and measured behavior of your own project. A green check also does not replace reviewing its findings or the user experience.

## Get started

Install the [global Vite+ `vp` CLI](https://viteplus.dev/guide/) first. On Windows, the official PowerShell installer is:

```powershell
irm https://vite.plus/ps1 | iex
```

On macOS or Linux:

```sh
curl -fsSL https://vite.plus | bash
```

Open a new terminal, run `vp help`, then run these commands from the repository root:

```sh
vp install --frozen-lockfile
vp dev
```

Use Node.js 24 and pnpm 12.21.0; Vite+ manages the package manager for this project. Local commits require Gitleaks and Semgrep on `PATH`; Semgrep fetches its `p/javascript` rules from the registry.

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `vp check`       | Check formatting, lint, and types with Vite+. |
| `vp run test`    | Run the project's current Node tests.         |
| `vp run build`   | Type-check and produce the static build.      |
| `vp run audit`   | Run Fallow's audit.                           |
| `vp run doctor`  | Run React Doctor.                             |
| `vp run preview` | Serve an existing production build locally.   |

Use `vp run` for the scripts in `package.json`: `vp test` invokes Vite+'s built-in Vitest command, while this project's `test` script currently uses Node's test runner. Likewise, `vp run build` includes the project's TypeScript build step.

## Tool decisions

### Development feedback and pull requests

| Current choice and execution point                                                                                                                                                              | Other viable approach                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vite+** runs Oxfmt, Oxlint, and type checks through `vp check` locally and in CI. `vp staged` checks staged changes in pre-commit; Oxlint also enforces feature import boundaries.            | Put more of the checks in the editor or CI if the hook becomes too slow. Other projects may keep their existing formatter and linter instead of migrating.                                                                                                                                                                                                                                                     |
| **React Doctor** checks staged files in pre-commit and the project in CI.                                                                                                                       | Run it only on pull requests or periodically if local feedback costs too much time. Its findings can overlap with lint rules.                                                                                                                                                                                                                                                                                  |
| **Fallow** runs `audit` in pre-commit and CI. Its broader dead-code, duplication, health, and architecture reports can guide later refactors, but are not all separate gates here.              | Start with reports or run it only on pull requests; verify each finding before deleting code or extracting shared logic.                                                                                                                                                                                                                                                                                       |
| **CodeRabbit** comments on GitHub pull requests as an external review bot; it is not configured by a repository workflow. Its suggestions are checked against the code before changes are made. | [PR-Agent](https://github.com/The-PR-Agent/pr-agent) or another review assistant could fill this role. For a larger team, [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) can request the responsible human reviewers. This repository has no CODEOWNERS file; AI review does not replace human ownership. |

### Security and dependencies

| Current choice and execution point                                                                                                                                                                                                                 | Other viable approach                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Semgrep** scans `src` and `.github/scripts` with `p/javascript` in pre-commit. It is not currently a CI step. **CodeQL** scans JavaScript and TypeScript on pull requests, `main`, and a weekly schedule, with findings in GitHub code scanning. | Both analyze project code for potential security issues, with different rules and methods. A project can choose one, run both, or move Semgrep to CI after comparing useful findings and cost.                                                                                                                           |
| **Gitleaks** scans staged changes in pre-commit and commits in the required CI job for possible secrets.                                                                                                                                           | A team may run it in CI only, though that reports a leak after it has been pushed. A real leaked credential must be revoked or rotated.                                                                                                                                                                                  |
| **Dependabot** checks npm and GitHub Actions versions weekly. Minor and patch version updates are grouped; security updates are handled separately by GitHub.                                                                                      | [Renovate](https://github.com/renovatebot/renovate) is another dependency-update service. Either way, generated PRs still need compatibility checks and review.                                                                                                                                                          |
| A **pnpm audit**-based script runs in pre-commit and CI. Unexcepted high and critical advisories fail the check; temporary package-level exceptions are documented in [audit-exceptions.json](.github/audit-exceptions.json).                      | [npm audit](https://docs.npmjs.com/cli/commands/npm-audit/) or [OSV-Scanner](https://google.github.io/osv-scanner/usage/scan-source) can check known dependency vulnerabilities. Choose the tool and severity policy for the package manager and risk model; an alert needs investigation of the actual dependency path. |
| **GitHub Dependency Review** reports dependency changes on pull requests without blocking them.                                                                                                                                                    | Make it a merge gate after agreeing on a policy and how to handle false positives and existing findings. It complements update bots and vulnerability scans.                                                                                                                                                             |

### Performance budgets

**Size Limit** measures every built JavaScript and CSS file using Brotli compression in the pull request's verified build. [The current budget](.github/bundle-size.json) is 20 KB per file by default, with a 200 KB exception for `assets/index.js`. The workflow reports each file and a pull request status. [BundleWatch](https://github.com/bundlewatch/bundlewatch) could serve a similar bundle-file budget role. File budgets can also be grouped by entry point or route, based on what users actually download; this configuration is only one example. A file-size check does not measure an entire page's images, network behavior, or interaction time.

**Lighthouse CI** measures the deployed Preview's current root page in three mobile runs and uses the median score. [The current thresholds](.github/lighthouse-thresholds.json) are Performance 90, Accessibility 90, Best Practices 90, and SEO 40. Results and reports are attached to the pull request workflow. Once the three planned pages exist, each important route can have its own measurements and budgets; that decision remains in [the work list](inprogress.md). Lighthouse's lab results should be interpreted alongside the page, environment, and eventually real-user data. Budgets are team decisions, not numbers to raise automatically when a PR fails.

## CI and deployment

GitHub Actions checks pull requests to `main` and pushes to `main`. It runs the dependency security check, Gitleaks, `vp check`, Node tests, Fallow, React Doctor, and the build. CodeQL and report-only Dependency Review have separate workflows. CI caches pnpm downloads, while the build is produced once per checked commit and saved as an artifact for deployment.

The deployment workflow reuses that verified build for an isolated Preview in a dedicated Vercel project. Each pull request gets its own URL for review and testing. The workflow smoke-tests the Preview, measures its bundle and root page, and publishes the required Preview deployment status. When the pull request closes or merges, its Preview deployment is removed. A successful `main` run deploys the checked build to a separate production Vercel project. The [live site](https://feature-based-minidesk.vercel.app/) currently displays the starter page.

## Next steps and AI-assisted development

The [work list](inprogress.md) tracks the approved but not yet installed TanStack Router and TanStack Query, and candidates such as OpenAPI TypeScript, Vitest, React Testing Library, MSW, Playwright, axe-core, visual testing, Storybook, and Stryker. It also tracks agent tools such as Modern Web Guidance, Vercel Agent Skills, Superpowers, Spec Kit, BMAD, Anthropic Skills, Context7, and Serena. Except for the two approved libraries, these are evaluations, not promised dependencies. Items may be added or removed; this README will change when a tool is adopted or its execution point changes.

The agent guide links to the [product direction](docs/product.md), [design references](docs/design.md), [API boundary](docs/api.md), and [task workflow](docs/agent-workflow.md). Later agent-readiness work will settle feature acceptance criteria, API schema, sample data, and optional tools. AI can help turn traces and network reports into testable hypotheses, inspect diffs, suggest small refactors from Fallow findings, generate meaningful tests and examples, and compare before-and-after reports. Those suggestions need confirmation with profiling, tests, CI output, and real-user evidence where available. [AGENTS.md](AGENTS.md), [frontend architecture](docs/architecture.md), and [development and contributing](docs/development.md) are the current starting points for that work.
