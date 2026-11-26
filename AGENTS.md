# MiniDesk agent guide

MiniDesk is a feature-based React and TypeScript frontend for To-do, Expenses, Focus, and Real-user monitoring. The four routes currently show coming-soon pages; the design images are references, not implemented features.

## Start with the relevant context

Read the request, current diff, and any approved task or feature spec. Select the guide for the **current step**; do not preload every guide that might become relevant later. For a feature with UI and remote data, read the product and UI guidance while building the UI, then open the API guide when implementing the data flow. Read the development checks when reaching verification.

| Work                                                              | Guide                                                                                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Product behavior                                                  | [Product](docs/product.md)                                                                                                   |
| New feature or assigned phase                                     | [Feature delivery map](docs/feature-delivery.md), [planning skill](.agents/skills/minidesk-feature-planning/SKILL.md)        |
| Feature UI                                                        | [Design rules and visual references](docs/design.md)                                                                         |
| Commissioned visual direction or UI redesign                      | [Agent tooling](docs/agent-tooling.md) and the [Anthropic frontend-design skill](.agents/skills/frontend-design/SKILL.md)    |
| Web UI, CSS, browser APIs                                         | [Modern Web Guidance policy](docs/modern-web-guidance.md) and [installed skill](.agents/skills/modern-web-guidance/SKILL.md) |
| React performance, component composition, or Vercel cost analysis | [Vercel skill policy](docs/vercel-agent-skills.md) and the matching installed skill                                          |
| Any source code change                                            | [Architecture](docs/architecture.md)                                                                                         |
| Remote data                                                       | [API](docs/api.md)                                                                                                           |
| Scripts, commands, checks, CI                                     | [Development](docs/development.md#checks-and-scripts)                                                                        |
| Documentation changes                                             | [Documentation map](docs/documentation.md)                                                                                   |
| Version-sensitive library APIs or cross-file symbol changes       | [Agent tooling](docs/agent-tooling.md)                                                                                       |

Before any edit, read [workflow section 1](docs/agent-workflow.md#1-scope-and-implement) and confirm the task's scope and checkout. Follow the verification, review, and PR steps at the stages specified there. Check frontend code and configuration before assuming a tool, client route, or test exists. For remote data, use the approved OpenAPI contract when T06 provides it; frontend tasks do not inspect backend source or infer API behavior from it.

Use Context7 and Serena only when the task calls for them. If an expected tool is missing or fails, consult [setup and troubleshooting](docs/agent-tooling-setup.md); do not run setup checks on every task or infer a machine-level failure from a restricted shell. Claim tool use only after a successful MCP response.

For new features, follow the [feature delivery map](docs/feature-delivery.md) and applicable Superpowers and Spec Kit skills. Implement only the assigned scope. Repository guides and the user's assignment take precedence over generic skill suggestions.

The project's web-platform target is **Baseline Widely available**. For browser API choices, follow the [Modern Web Guidance policy](docs/modern-web-guidance.md); for React performance, composition, or Vercel analysis, follow the [Vercel skill policy](docs/vercel-agent-skills.md).

## Rules for every task

- Work within the assigned scope. The user decides which tasks run in parallel; coordinate shared files and never change another task's branch or worktree.
- Use the assigned checkout; the user controls branches, worktrees, commits, pushes, PRs, and parallel assignments. Follow the [agent workflow](docs/agent-workflow.md) for base and handoff checks.
- Do not treat a mockup, research note, or unfinished task as an approved requirement. Do not introduce unapproved dependencies, tools, frameworks, or architectural decisions. Ask before making an unclear repeatable decision; record the answer in its owning guide, spec, or skill.
- Update affected documentation and links in the same change. Keep one source of truth per topic instead of copying contracts into agent adapters or unrelated guides.
- For a significant choice between alternatives or a decision with important rationale, ask whether the user wants an ADR. Create one only after approval; follow [documentation.md](docs/documentation.md#decision-records).
- Never rewrite a commit that has been pushed. Put every follow-up change in a new commit and push normally; do not force-push.
- Verify claims with the relevant checks and report the evidence and its limits. The user makes the final merge decision; never merge a PR on the user's behalf.
