# MiniDesk agent guide

MiniDesk is a feature-based React and TypeScript frontend for To-do, Expenses, Focus, and Real-user monitoring. The four routes currently show coming-soon pages; the design images are references, not implemented features.

## Start with the relevant context

Read the request, current diff, and any approved task or feature spec. Apply every matching row; open only the guides needed for the work:

| Work                                                              | Guide                                                                                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Product behavior                                                  | [Product](docs/product.md)                                                                                                   |
| New feature or assigned phase                                     | [Feature delivery map](docs/feature-delivery.md), [planning skill](.agents/skills/minidesk-feature-planning/SKILL.md)        |
| Feature UI                                                        | [Product behavior](docs/product.md), [design rules and visual references](docs/design.md)                                    |
| Web UI, CSS, browser APIs                                         | [Modern Web Guidance policy](docs/modern-web-guidance.md) and [installed skill](.agents/skills/modern-web-guidance/SKILL.md) |
| React performance, component composition, or Vercel cost analysis | [Vercel skill policy](docs/vercel-agent-skills.md) and the matching installed skill                                          |
| Any source code change                                            | [Architecture](docs/architecture.md)                                                                                         |
| Remote data                                                       | [API](docs/api.md)                                                                                                           |
| Scripts, commands, checks, CI                                     | [Development](docs/development.md)                                                                                           |
| Documentation changes                                             | [Documentation map](docs/documentation.md)                                                                                   |

Before any edit, read [workflow section 1](docs/agent-workflow.md#1-scope-and-implement) and confirm the task's scope and checkout. Follow the verification, review, and PR steps at the stages specified there. Check actual code and configuration before assuming a tool, route, test, or API exists.

For new features, refine the idea with the applicable Superpowers skills, then use the installed Spec Kit skills to produce the approved spec, plan, and selectable tasks. Use the [feature delivery map](docs/feature-delivery.md) for the shared layout phase and four feature phases. For an assigned task, implement only its approved scope. Repository guides and the user's assignment take precedence over generic skill suggestions about stack, branches, worktrees, or extra approvals.

The project's web-platform target is **Baseline Widely available**. For relevant frontend work, use the installed Modern Web Guidance skill to search and retrieve focused guidance before choosing browser APIs; follow its fallback advice for features outside that target. Run the CLI version pinned in the policy guide (currently 1.0.1), including when upstream skill examples show `@latest`; scope any command approval to that version. Disable CLI telemetry for repository work. Check proposed patterns against the project's React components, design rules, and feature boundaries. See the policy guide for modernization scans and evaluation.

For React performance and reusable component API work, use only the applicable rules from the installed Vercel skills, as scoped in the Vercel skill policy. For a requested Vercel cost or deployment performance audit, read that policy before opening `vercel-optimize`; its framework and metrics prerequisites apply.

## Rules for every task

- Work within the assigned scope. The user decides which tasks run in parallel; coordinate shared files and never change another task's branch or worktree.
- For a new task, use the assigned checkout and confirm its intended base is up-to-date `main`; do not create a branch yourself. At handoff, provide the user with the branch command to run. Never reuse a checkout belonging to an ongoing task. For parallel tasks, the user provides each task's directory and assignment. Do not repurpose a checkout that still belongs to an ongoing task; wait for the user to provide another directory. Keep all review fixes and follow-up work for an ongoing task on its existing branch and worktree. Never create or set up another project or worktree on your own; for parallel tasks, the user provides each task's directory and assignment.
- Do not treat a mockup, research note, or unfinished task as an approved requirement. Do not introduce unapproved dependencies, tools, frameworks, or architectural decisions. Ask before making an unclear repeatable decision; record the answer in its owning guide, spec, or skill.
- Update affected documentation and links in the same change. Keep one source of truth per topic instead of copying contracts into agent adapters or unrelated guides.
- For a significant choice between alternatives or a decision with important rationale, ask whether the user wants an ADR. Create one only after approval; follow [documentation.md](docs/documentation.md#decision-records).
- Never rewrite a commit that has been pushed. Put every follow-up change in a new commit and push normally; do not force-push.
- Verify claims with the relevant checks and report the evidence and its limits. The user makes the final merge decision; never merge a PR on the user's behalf.
