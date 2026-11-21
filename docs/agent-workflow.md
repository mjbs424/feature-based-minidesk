# Agent task workflow

This guide owns task execution, independent review, and PR readiness. Use it after selecting the task's relevant topic guides from [AGENTS.md](../AGENTS.md). One owner takes an assigned task through a merge-ready PR; the user chooses concurrent tasks.

## 1. Scope and implement

Record the requested outcome, acceptance evidence, owned paths, and dependencies. Inspect the branch, diff, and uncommitted files. Start from current `main` on a suitably named branch or isolated worktree; use separate worktrees for concurrent tasks and coordinate shared-file changes. Do not infer approval for a different task or an undecided architecture choice from research.

Read the approved feature spec when one exists. For a new feature, settle its behavior and acceptance criteria with the user before inventing them; the later Spec Kit task does not make speculative requirements binding. Keep implementation within the assigned feature and respect the [feature boundaries](architecture.md#dependencies). Add meaningful tests supported by the current setup when task risk warrants them; do not invent an undecided UI test framework or test implementation details. Update the owning documentation when a decision or rule changes.

## 2. Verify

Read [development.md](development.md) for the current commands, pre-commit hook, CI, Preview, and check coverage. Run its full local check set before PR review, plus any checks required by the changed surface. Inspect Fallow and React Doctor findings and dependency/security results where applicable. Record results and unverified risks without claiming that a check covers more than its configuration does.

## 3. Independent review

Have **all five core reviewers** independently review every task, including documentation-only tasks. Give them the actual diff, relevant context, outcome, and acceptance criteria; the implementer does not count as a reviewer. Whenever any documentation or agent instruction changes, add an **independent sixth documentation reviewer** using the [documentation review brief](documentation-review.md).

| Reviewer                        | Focus                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Code quality                    | Correctness, maintainability, duplication, and consistency with the task.                                    |
| Performance                     | Bundle, rendering, requests, latency, and measurement gaps.                                                  |
| Security                        | Inputs, data flow, dependencies, secrets, permissions, and abuse paths.                                      |
| Technical architecture          | Feature ownership, types, installed tools, and build constraints.                                            |
| Scenarios and edge cases        | Loading, empty/error states, rapid actions, cancellation, races, retries, and boundaries where applicable.   |
| Documentation, when docs change | Accuracy, ownership, links, missing context, contradictions, repetition, and unnecessary always-loaded text. |

Review findings must be checked against the current change before fixing them. A reviewer may report no applicable issue with a reason; do not invent code findings for prose changes. Record each finding and disposition. After a fix, rerun affected checks and ask reviewers whose area changed to recheck; repeat all applicable reviews if the scope changes substantially. If an independent reviewer cannot run, report the missing gate rather than claiming it passed.

## 4. PR loop and finish line

Stage only task-owned files and commit from the repository root with the normal pre-commit hook; never bypass it. An assigned task authorizes its branch, commit, push, and PR unless the user limits delivery. Push and open a PR to `main` with purpose, decisions, checks, reviews, and remaining limits. Use a draft while review is active when appropriate.

Wait for required CI and Preview results and a completed CodeRabbit review of the **latest head**. Inspect build, deployment, bundle-size, and Lighthouse reports within their [documented coverage](development.md#check-coverage). Verify findings against current code; fix valid ones on the same branch, rerun affected checks and reviews, push, and repeat. A pending or unavailable review remains an open gate. If `main` advances or mergeability changes, update the branch where needed and revalidate the affected work.

Finish only when the latest head is mergeable, required checks and Preview are green, all applicable independent reviews and CodeRabbit have no unresolved actionable findings, documentation and diff are current, and the PR status is reported to the user. If access or an external service blocks a gate, report the exact blocker and verified state. The user alone merges.
