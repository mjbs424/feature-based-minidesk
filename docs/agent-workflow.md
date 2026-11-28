# Agent task workflow

This guide owns task execution, self-review, and handoff instructions. Use it after selecting the task's relevant topic guides from [AGENTS.md](../AGENTS.md). One owner takes an assigned task through implementation, verification, and self-review. The user chooses concurrent tasks and provides their directories.

## 1. Scope and implement

Record the requested outcome, acceptance evidence, owned paths, and dependencies. Inspect the current branch, diff, and uncommitted files in the assigned checkout. Do not create branches, commits, pushes, or pull requests yourself.

For a new task, use the assigned checkout and verify that its current HEAD is based on an up-to-date `main` matching `origin/main` before implementation. Do not create or switch branches yourself. If the checkout is on another branch, has unrelated uncommitted changes, or its base cannot be verified, report the blocker instead of proceeding on an unsuitable base. At handoff, provide the exact branch-creation command for the user to run, preserving the completed task changes.

Never use another ongoing task's checkout. For an ongoing task, including review responses, bug fixes, and follow-up work, stay on its existing branch and worktree. Never create or switch to another branch or worktree for that task. The user provides directories for concurrent tasks and assigns their work. Coordinate shared-file changes. Do not infer approval for a different task or an undecided architecture choice from research.

Read the approved feature spec when one exists. For a new feature, use the [feature delivery map](feature-delivery.md) and installed Spec Kit skills to refine behavior, produce a plan, and identify selectable tasks. Settle material behavior and acceptance criteria with the user before implementing dependent work; a generated spec does not make speculative requirements binding. Superpowers helps with discovery and execution, while Spec Kit owns the spec, plan, and task list. Keep implementation within assigned tasks and respect the [feature boundaries](architecture.md#dependencies). Add meaningful tests supported by the current setup when task risk warrants them; do not invent an undecided UI test framework or test implementation details. Update the owning documentation when a decision or rule changes.

## 2. Verify

Read [development.md](development.md) for the current commands, pre-commit hook, CI, Preview, and check coverage. Run its full local check set before handoff, plus any checks required by the changed surface. Before saying changes are ready to commit, run `pnpm exec react-doctor . --scope files --base HEAD --yes --no-score --blocking error` and the hook-equivalent `pnpm exec fallow audit --base HEAD --gate all`; `pnpm run audit` alone does not reproduce that gate. Fix actionable findings and rerun the failing check. Inspect dependency/security results and record any check that could not run. Compare staged and working-tree versions of task files so later edits are not mistaken for verified staged content; the user's staged-file hook remains the final check after staging.

## 3. Self-review and correction

After implementation and relevant checks, perform a structured self-review of the complete task diff using every applicable perspective below. Review each perspective deliberately rather than treating the list as a single general pass. Do not spawn subagents or claim independent review. Use the [documentation self-review brief](documentation-review.md) whenever documentation or agent instructions change.

| Perspective                     | Review focus                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Code quality                    | Correctness, maintainability, duplication, and consistency with the task.                                    |
| Performance                     | Bundle, rendering, requests, latency, and measurement gaps.                                                  |
| Security                        | Inputs, data flow, dependencies, secrets, permissions, and abuse paths.                                      |
| Technical architecture          | Feature ownership, types, installed tools, and build constraints.                                            |
| Scenarios and edge cases        | Loading, empty/error states, rapid actions, cancellation, races, retries, and boundaries where applicable.   |
| Documentation, when docs change | Accuracy, ownership, links, missing context, contradictions, repetition, and unnecessary always-loaded text. |

Check each possible finding against the current diff before fixing it. For each applicable perspective, record either the issue and its disposition or why it found no actionable issue; do not invent code findings for prose changes. Fix valid issues, rerun affected checks, and repeat the affected perspectives after fixes. Repeat all applicable perspectives if the scope changes substantially. Report any check or review that could not be completed; do not imply it passed.

## 4. User handoff and finish line

Once implementation, checks, and self-review are complete, report the result and provide copy-ready commands for the user to create the task branch, stage only task-owned files, commit, and push. Include a ready-to-paste PR description with purpose, decisions, checks, self-review, and remaining limits. The user performs these Git and PR actions. Do not claim that a PR exists or that remote checks passed until verified.

For a bug fix or review response on the same existing branch, finish the fix, run affected checks, and self-review the affected perspectives. Then provide only a copy-ready git commit -m "<message>" command. Do not stage files, modify the Git index, or provide git add instructions; the user is responsible for selecting and staging changes. Do not provide branch, push, or PR creation instructions for that follow-up. Never amend, rebase, reset, or force-push to rewrite a commit that has been pushed.
When the user later requests help with an existing PR, inspect its current CI, Preview, and CodeRabbit status, including unresolved review threads on older heads. Check findings against the current diff, fix valid ones on the same branch, rerun affected checks, and repeat the affected self-review. Report remote gates only when their actual status is available. The user alone merges.
