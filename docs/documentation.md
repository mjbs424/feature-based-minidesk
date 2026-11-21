# Documentation map and maintenance

`AGENTS.md` is the short, always-loaded entry point. Each topic below has one owner; read only the topics relevant to the task. Keep new project documentation in English. Existing Persian research notes remain in their current language until the user approves their revision.

| Topic                                        | Source of truth                                    | When to read or update                                                                                                           |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Product intent and feature scope             | [product.md](product.md)                           | Read for feature work; update only after a product decision.                                                                     |
| Visual direction and design references       | [design.md](design.md), with images in `public/`   | Read before UI work; update when a visual decision or asset changes.                                                             |
| Code ownership, imports, routing boundaries  | [architecture.md](architecture.md)                 | Read before source changes; update with an architecture contract change.                                                         |
| Remote data flow and unsettled API decisions | [api.md](api.md)                                   | Read before remote data work; update once the API contract is chosen.                                                            |
| Local setup, checks, hook, CI, deployment    | [development.md](development.md)                   | Read before validation or delivery; update with scripts or workflow changes.                                                     |
| Agent task lifecycle and review              | [agent-workflow.md](agent-workflow.md)             | Read for every task: section 1 before the first edit; remaining steps at their stages. Update when the workflow changes.         |
| Independent documentation review             | [documentation-review.md](documentation-review.md) | Give to a separate reviewer whenever documentation changes; update the brief when its review criteria change.                    |
| Current work queue                           | `inprogress.md` when present on the active branch  | Read for context after the user assigns a task; it does not authorize an agent to select work or prove a candidate is installed. |

## Future artifacts

- Put an actual feature's goal, scenarios, state behavior, data needs, and acceptance criteria in `specs/<feature>/`. Create a spec when that feature is commissioned. Spec Kit evaluation belongs to T31; this map does not install it or prescribe its generated layout.
- Put user-authorized decision records in `docs/decisions/`, one short record per decision. Link the resulting rule from its topic document. Do not create a decision record for a routine edit.
- Put a reusable project skill under `.agents/skills/<name>/SKILL.md` after its trigger, inputs, outputs, and compatible agents are tested. Skill selection and portability belong to later tasks. A skill points to these source documents instead of duplicating them.
- Put API schemas, samples, mocks, and generated types where the eventual API task decides. Do not create a placeholder schema or example response before the data contract exists.
- Use `CLAUDE.md` only as a pointer to `AGENTS.md`. Add another tool adapter only if the tool actually needs one, and verify that it loads the shared guide.

## Decision records

When an architecture, tool, technology, or workflow choice has meaningful alternatives or an important project-specific rationale, explain the choice to the user and ask whether to record it as an ADR. Create the record only after explicit approval. Capture the problem, decision drivers, options actually considered, outcome, and material trade-offs and consequences; do not invent a comparison that did not happen. Use `Proposed` for an undecided choice and `Accepted` only for an approved one. Keep the operational rule in its owning topic guide and link to the ADR for its rationale.

## Change discipline

The task owner updates only the affected source documents in the same PR. Change `AGENTS.md` only when the always-needed rules or document selection map change. Check links and remove outdated statements rather than adding a second explanation elsewhere.

Research reports are evidence, not binding instructions. State unresolved choices plainly. For a repeatable ambiguity, ask the user and record the answer in the owning document or skill before applying it broadly. Keep examples and paths accurate against the repository, and avoid empty folders made only to illustrate a possible architecture. The [documentation reviewer](documentation-review.md) independently checks these properties whenever a document changes.
