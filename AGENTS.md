# MiniDesk agent guide

MiniDesk is a small React and TypeScript frontend for To-do, Expenses, and Focus. The repository is feature based. The app still shows a starter page; the design images are references for future UI, not implemented screens. Keep changes focused on the assigned task and report evidence rather than assuming a tool or mockup proves behavior.

## Read before changing anything

1. Read the request, the current diff, and the relevant task or feature specification. Read only the linked topic documents needed for the change.
2. For product behavior, read [product](docs/product.md). For visual work, read [design](docs/design.md) and the relevant images in `public/`. For code ownership and data flow, read [architecture](docs/architecture.md). For API work, read [API contract](docs/api.md). For commands and CI, read [development](docs/development.md).
3. Follow the [task and review workflow](docs/agent-workflow.md) through verification, independent review, CI, Preview, and pull request readiness. The [documentation map](docs/documentation.md) explains where new specifications, decisions, examples, and skills belong.
4. Check `package.json`, `vite.config.ts`, and installed tooling before claiming a command, library, route, or test framework exists.

## Hard project boundaries

- `src/app` owns bootstrap and providers; `src/routes` connects URLs to feature pages. A feature owns its page, behavior, state, and feature UI. `src/shared` holds only domain-neutral code. Never import one feature from another or use `shared` to bypass that rule.
- Every remote operation passes from the feature hook or controller through that feature's **service**, then its endpoint, then shared transport. Components do not call endpoints. Create layers when a real operation needs them.
- TanStack Router and TanStack Query are approved choices, but are **not installed yet**. Their exact setup and contracts belong to later tasks. Tailwind CSS and shadcn/ui theme infrastructure are installed; add components only when needed.
- The API schema format/source, generated types, runtime response validation, and UI testing strategy remain undecided. Do not present OpenAPI, Vitest, Playwright, MSW, or a backend as adopted. Ask when a task depends on those decisions.
- The UI references in `public/` guide the three pages in light, dark, desktop, and mobile modes. They are visual references, not proof that their data, wording, or controls are final behavior.

## Commands and evidence

Run commands from the repository root. Install the global Vite+ `vp` CLI as described in [development](docs/development.md).

| Command                        | Purpose                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `vp install --frozen-lockfile` | Install the locked dependencies.                                                         |
| `vp dev`                       | Start the local app.                                                                     |
| `vp check`                     | Format, lint, and type checks.                                                           |
| `vp run test`                  | Run the current `node --test` project script; `vp test` is a different built-in command. |
| `vp run build`                 | Type-check and build through the project script.                                         |
| `vp run audit`                 | Run Fallow's configured audit.                                                           |
| `vp run doctor`                | Run React Doctor.                                                                        |

Run the relevant checks for every change and the full project checks before requesting PR review. Review Fallow's duplicate, dead-code, health, architecture, and complexity findings without claiming that its configured audit blocks every category. Inspect hook and CI output; never bypass the hook. Commit from the repository root. Report the commands, results, and any unverified risk.

## Ownership of these instructions

The agent doing a task owns keeping `AGENTS.md`, its adapters, linked guides, specifications, and applicable skills accurate **in the same change** when a workflow, command, boundary, or accepted decision changes. Keep one source of truth per topic and update its links; do not copy entire contracts into tool-specific files.

If a recurring workflow, requirement, acceptance rule, or cross-feature choice is unclear, **ask the user before deciding or acting on that ambiguous part**. Use the answer to update the owning document, specification, or skill so the next agent can follow it without guessing. Do not silently turn a design image, research proposal, or unfinished task into an approved requirement. Routine implementation choices that are already covered by a contract may proceed without a new question.

## Task ownership and finish line

Work on one assigned task through implementation, checks, independent specialist reviews, corrections, and re-review until its own PR is ready to merge. The task assignment authorizes this lifecycle, including a task branch, commit, push, and PR, unless the user narrows its scope. Use a branch or isolated worktree based on current `main` and stage only owned files. Wait for CI, Preview, and a completed CodeRabbit review of the latest head; verify and fix valid findings, push again, and repeat until required checks are green and no actionable review remains. The user makes the final merge decision; do not merge the PR. If access or permissions block the finish line, report the exact blocker and the completed local evidence.

The user decides which tasks may run in parallel. Never assume permission to split a task across concurrent chats or to edit another task's files. Record the task's owned paths and dependencies, avoid shared-file edits unless explicitly coordinated, and do not touch another agent's branch or worktree.
