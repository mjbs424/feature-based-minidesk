# MiniDesk agent guide

MiniDesk is a feature-based React and TypeScript frontend for To-do, Expenses, and Focus. The app currently shows a starter page; the design images are references, not implemented features.

## Start with the relevant context

Read the request, current diff, and any approved task or feature spec. Apply every matching row; open only the guides needed for the work:

| Work                        | Guide                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Product behavior            | [Product](docs/product.md)                                                              |
| Feature UI                  | [Product](docs/product.md), [design](docs/design.md), and the relevant `public/` images |
| Any source code change      | [Architecture](docs/architecture.md)                                                    |
| Remote data                 | [API](docs/api.md)                                                                      |
| Setup, commands, checks, CI | [Development](docs/development.md)                                                      |
| Documentation changes       | [Documentation map](docs/documentation.md)                                              |

Before the first edit, read [workflow section 1](docs/agent-workflow.md#1-scope-and-implement) and complete its scope and branch setup. Follow later steps when due. Check actual code and configuration before assuming a tool, route, test, or API exists.

## Rules for every task

- Work within the assigned scope. The user decides which tasks run in parallel; coordinate shared files and never change another task's branch or worktree.
- Do not treat a mockup, research note, or unfinished task as an approved requirement. Do not add an unapproved dependency or framework. Ask before making an unclear repeatable decision; record the answer in its owning guide, spec, or skill.
- Update affected documentation and links in the same change. Keep one source of truth per topic instead of copying contracts into agent adapters or unrelated guides.
- Verify claims with the relevant checks and report the evidence and its limits. The user makes the final merge decision; never merge a PR on the user's behalf.
