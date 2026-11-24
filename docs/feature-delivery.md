# Feature delivery map

This is the project-level queue for the four planned pages. A project phase is a product milestone; Spec Kit may also use phases **inside** a feature's `tasks.md` to order setup and user stories. Those internal headings do not change this five-phase map. A user can assign a whole phase or named tasks in it. Only assigned work is implemented.

## Current baseline and decision rules

- The four URLs and their coming-soon pages exist. The app shell, shared controls, Storybook, real feature behavior, and real API contracts do not yet exist.
- [Architecture](architecture.md), [product](product.md), [design](design.md), [API](api.md), and [development](development.md) own their respective contracts. Existing decisions are constraints on planning. Propose any different framework, library, or architecture as a separate optional decision task with need, alternatives, integration cost, and evidence; do not silently replace the stack.
- [Design.md](design.md) owns the supplied visual references and the missing monitoring reference.
- A task that needs an unsettled product choice starts with a decision brief and acceptance scenarios. Continue with independent work, but do not implement the dependent behavior until the user settles that choice. Never invent an endpoint, data contract, persistence model, or global query policy.

## Phase 0 — shared layout and navigation

| Task | Deliverable and acceptance evidence                                                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1   | Compare all supplied layouts and document shell regions, navigation labels and destinations, mobile menu behavior, active state, theme behavior, and the missing monitoring reference. Resolve material design differences with the user; update `design.md`.                                                   |
| L2   | Implement one app-owned shell around the route outlet: desktop rail/sidebar/top utility area and mobile header/menu/content composition. Confirm direct visits and refreshes for all four URLs, back/forward navigation, active indication, keyboard operation, accessible names, and responsive widths.        |
| L3   | Build the first truly shared, domain-neutral UI primitives needed by the shell, using `components.json`, semantic tokens, and `src/shared/ui`. Inventory existing components before adding one. Add stories for every public variant and relevant interaction/state once Storybook is available.                |
| L4   | Install and configure Storybook when the first shared UI component needs a visual contract. Document light/dark and responsive stories, accessibility checks, and how consumers find variants. Verify its build and browser rendering. This task completes before any later phase creates a new shared control. |
| L5   | Verify the shell against the supplied desktop/mobile references in both themes, including the right inset of dark To-do, safe areas, navigation consistency, accessibility, and browser deep links. Record differences that need user decisions.                                                                |

**Gate:** The shell is a single reusable route composition; feature pages render inside it without recreating navigation. The shared component inventory and stories are discoverable. L1 precedes visual implementation; L4 precedes the first reusable control's completion.

## Phase 1 — To-do

| Task | Deliverable and acceptance evidence                                                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TD1  | Refine the To-do journey from the selected references: task list, today/upcoming grouping, completion, categories, and add action. Resolve create/edit/delete semantics, ordering, dates, categories, persistence, and data source in the approved spec; provide acceptance scenarios and edge cases.                                |
| TD2  | Map the approved spec to `spec.md`, `plan.md`, and dependency-ordered `tasks.md`. Record the existing route, feature boundaries, shell, shared component inventory, visual references, data ownership, and tests. Run Spec Kit consistency analysis and fix contradictions before implementation.                                    |
| TD3  | Implement the approved smallest usable To-do slice within `src/features/to-do`; reuse the shell and shared UI. Add only data/API layers justified by the approved contract. Verify create/display/completion or whichever actions the spec approves, along with empty, error, loading, keyboard, and mobile states where applicable. |
| TD4  | Match desktop/mobile, light/dark references; add stories for new shared variants and meaningful feature states. Run relevant tests, accessibility checks, build, browser flows, and self-review. Close only with observable evidence and updated task status.                                                                        |

## Phase 2 — Expenses

| Task | Deliverable and acceptance evidence                                                                                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX1  | Refine transaction list, monthly budget summary, category breakdown, and add action. Set currency, amount sign, dates, recurrence, aggregation period, persistence, and source with the user in acceptance scenarios.                              |
| EX2  | Produce and analyze Spec Kit spec/plan/tasks against the actual shell, To-do components and stories, feature boundaries, and settled API decisions. Separate genuinely shared controls from expense-specific composition.                          |
| EX3  | Implement the approved smallest usable expense journey in `src/features/expenses`, including honest empty/loading/error states where relevant. Reuse existing fields, selects, buttons, dialogs, tables, and labels through their documented APIs. |
| EX4  | Verify computed amounts and edge cases against the approved rules, visual references in both themes and viewports, keyboard/accessibility behavior, stories, tests, and browser flows.                                                             |

## Phase 3 — Focus

| Task | Deliverable and acceptance evidence                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FO1  | Refine timer, priority tasks, focused-time summary, and session history. Set start/pause/resume/end, background-tab behavior, time rounding, task association, persistence, and source in the approved spec.         |
| FO2  | Produce and analyze Spec Kit spec/plan/tasks against the shell, current component stories, architecture, and approved timer behavior. Do not import To-do internals to reuse its data shape.                         |
| FO3  | Implement the approved smallest usable session journey in `src/features/focus`; reuse shared UI and keep domain logic local. Handle refresh, visibility, rapid actions, and timing boundaries according to the spec. |
| FO4  | Verify timer behavior with meaningful tests and browser checks, and compare desktop/mobile light/dark UI, stories, accessibility, and performance to the references.                                                 |

## Phase 4 — Real-user monitoring

| Task | Deliverable and acceptance evidence                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RM1  | Define audience, questions answered, metrics and definitions, collection/consent boundaries, data source, retention, aggregation, privacy, and empty/error behavior. Produce a visual direction with the user because no reference image exists. |
| RM2  | Produce and analyze Spec Kit spec/plan/tasks using only approved metrics and source contracts. Record how the page fits the existing shell and design system; introduce no telemetry SDK or backend until approved.                              |
| RM3  | Implement the approved smallest useful monitoring view in `src/features/real-user-monitoring`. Reuse shared display controls and only the API layers backed by a real contract.                                                                  |
| RM4  | Verify metric definitions and data states against fixtures or a contracted source, plus responsive/themed UI, accessibility, performance, browser flow, and review evidence.                                                                     |

## How a new feature enters the queue

1. Read the request and current code, routes, docs, assets, and Storybook stories. Use Superpowers brainstorming to refine user purpose and alternatives where behavior is unclear. Present choices only for decisions that change the product; record approval in the owning spec. The user may commission a bounded task directly.
2. Use Spec Kit to write or update `spec.md`, `plan.md`, and `tasks.md` under `specs/<feature>/`. Check `architecture.md`, `design.md`, shared UI inventory, Storybook, and the current stack before planning. Use `$speckit-clarify` for material gaps and `$speckit-analyze` after tasks. Show stable task IDs, dependencies, acceptance checks, and exact owned files so the user can request an individual task or range.
3. For each selected task, apply relevant Superpowers execution, debugging, test, review, and verification skills inside the [agent workflow](agent-workflow.md). A skill may recommend an extra branch, worktree, approval, or test; the repository's workflow and the user's assignment decide those actions. Do not run the entire feature because one task was selected.
4. Keep one source of truth: approved behavior in `spec.md`, technical choices in `plan.md` and topic guides, executable checklist in `tasks.md`, project phase in this map. Report which checks actually ran. Update only completed task checkboxes and any affected source documents.
