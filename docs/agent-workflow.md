# Agent task workflow and review

This is the workflow for an assigned MiniDesk task. One agent owns a task from start through a merge-ready pull request. The user alone chooses which tasks may run concurrently and performs the final merge. Read [AGENTS.md](../AGENTS.md) first, then the task's relevant [documentation](documentation.md) and spec. Do not infer approval for a different task, library, API contract, or architecture change from a research note.

## 1. Bound the task

Record the requested outcome, acceptance evidence, owned feature/paths, dependencies, and files that belong to another active task. Inspect the current branch and uncommitted files before editing. Start from current `main` in a suitably named branch or isolated worktree. For a concurrent assignment, use a separate branch/worktree and coordinate shared-file changes; never reuse another task's working tree or cross feature boundaries to get a task done. If shared ownership or a repeatable decision is unclear, ask the user before proceeding with that part and update the owning document from the answer.

For UI, read [product](product.md), [design](design.md), the relevant `public/` images, and the feature spec. For architecture or data changes, read [architecture](architecture.md) and [API](api.md). For any delivery, read [development](development.md). A new feature gets a spec when commissioned; T31 will evaluate Spec Kit later and does not authorize generating speculative feature requirements now.

## 2. Implement and check

Make a focused change inside the owned feature. Keep `app`, `routes`, `features`, and `shared` responsibilities intact. Keep every remote request on the service path. Add tests that exercise meaningful behavior and risk once the test level is chosen; do not add tests that merely repeat implementation details. Recheck relevant docs and update accepted decisions in the same change.

Run the project's real commands from the repository root. At minimum, run `vp check`, `vp run test`, and `vp run build` before PR review. Run `vp run audit` and `vp run doctor`, inspect their findings, and run the dependency security script when dependencies change. Read the pre-commit and CI results, including Fallow, React Doctor, Semgrep/Gitleaks, bundle size, and Lighthouse where applicable. The present bundle check measures JS/CSS, not all static assets, and Lighthouse visits only the root page. A check's coverage is only what its actual configuration runs; do not claim it verifies all duplication, architecture, security, browser behavior, or asset cost. Record the command, result, and relevant limits in the PR.

## 3. Independent specialist review

After implementation, request **five independent agents** to inspect the actual diff and relevant context. Give each the same task objective and acceptance criteria, with a distinct review assignment. They review; the task owner makes corrections. Do not ask the implementer to count as an independent reviewer.

| Reviewer                 | Primary questions                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code quality             | Is behavior correct, maintainable, nonduplicative, and consistent with the task and existing patterns?                                                |
| Performance              | Could the change increase bundle cost, rendering work, requests, or user-perceived latency? What evidence is needed?                                  |
| Security                 | Are input, data flow, dependencies, secrets, permissions, and abuse paths handled appropriately?                                                      |
| Technical architecture   | Does the change fit feature ownership, API/service direction, types, installed tools, and build/deployment constraints?                               |
| Scenarios and edge cases | What happens for loading/empty/error states, rapid actions, cancellation, race conditions, retries, stale data, and boundary values where applicable? |

All five reviews apply to each task, including documentation tasks, with findings proportionate to the changed surface. A reviewer may report “no applicable issue” with a short reason; do not fabricate code findings for prose changes. Record each review's findings and disposition. Verify findings against the code and requirements before fixing them. After corrections, rerun the affected checks and ask every reviewer whose risk area the new diff touches to recheck; repeat all five if the scope changes substantially. Continue until actionable findings are resolved. If independent agents cannot be run in the current environment, state that limitation and do not claim the review gate passed.

## 4. Pull request loop

Stage only task-owned files. Commit from the repository root so the real pre-commit hook runs; never use a bypass flag. The assignment authorizes push and PR creation unless the user explicitly limits delivery. Push the task branch and open a PR to `main` with purpose, decisions, checks, review evidence, and remaining limitations. A draft PR is appropriate while review is active. Wait for required CI and Preview results, inspect build/deployment and performance reports, and wait for CodeRabbit to complete its review of the latest head. Verify its comments against current code. Fix valid findings on the same branch, rerun affected checks, push, and repeat. A pending or unavailable review is an open gate, not a clean review. Do not dismiss an open actionable finding simply because a different check is green.

The task is finished when the PR is ready for the user to review and merge: required checks and Preview are green for the latest head, the five specialist reviews have no unresolved actionable findings, CodeRabbit has completed the latest-head review with no unresolved valid findings, the branch is mergeable against current `main`, the documentation and diff are current, and the final PR status is reported to the user. If `main` moves or mergeability changes, update the branch where needed and rerun checks and affected reviews before calling it ready. Never merge on the user's behalf. If a service, permission, or external review is unavailable, stop at the strongest verified state and report the exact missing gate instead of calling the PR merge-ready.

## 5. Keep the next task predictable

The task owner updates `AGENTS.md`, the relevant guide/spec/decision, and any accepted skill when a repeated rule or workflow becomes clear. Ask the user about an unclear repeatable choice before applying it across tasks, then save the answer in its one source of truth. Keep the task's branch and paths isolated so the user can assign unrelated work in another chat without accidental interference.
