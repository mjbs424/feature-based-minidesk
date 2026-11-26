# MiniDesk constitution

## Principles

### I. Preserve the existing product and stack

Read `docs/product.md`, `docs/design.md`, `docs/architecture.md`, `docs/api.md`, and the relevant frontend configuration before specifying a feature. Preserve their established contracts. Use T06/OpenAPI for remote-data details once available; do not inspect the demo backend to derive frontend contracts. A new technology or architecture is an optional proposal, never an implicit requirement of a feature.

### II. Specify approved behavior

Use supplied designs for visual direction, not inferred functionality or fake data. State user journeys, acceptance scenarios, boundaries, accessibility, mobile/theme behavior, and applicable loading/empty/error/success states. Mark material product, persistence, metric, or API choices as unresolved until the user decides. Never create a fictional endpoint or response schema to complete a template.

### III. Reuse the shell and UI contracts

Apply the UI ownership and reuse rules in `docs/architecture.md#ui-foundation`, the visual rules in `docs/design.md`, and the layout prerequisites in `docs/feature-delivery.md`. Check actual components and stories when planning; this constitution does not define a second UI contract.

### IV. Make selected tasks independently executable

Spec Kit owns specification, technical plan, and dependency-ordered tasks. Each task names its phase, prerequisites, affected paths, observable acceptance, and checks. A user may request one task without authorizing the rest. Do not generate generic setup tasks for infrastructure already installed. The five project phases in `docs/feature-delivery.md` are distinct from Spec Kit's internal task phases.

### V. Verify claims with actual evidence

Apply risk-appropriate tests, browser checks, accessibility review, build and CI as described in `docs/development.md` and `docs/agent-workflow.md`. Superpowers skills help execute and review selected work. They do not replace the repository workflow or prove a check passed. Preserve unrelated work.

## Governance

`AGENTS.md` routes to the source documents; each topic guide owns its contract. Keep this constitution a short set of planning principles and pointers, not a parallel copy of `architecture.md` or another guide. Before amending it, compare the proposed rule with the owning guide and actual configuration. Update the owning guide first or in the same change, then keep only the necessary pointer here; resolve any conflict rather than allowing the two versions to diverge. The user's current assignment and the owning guide govern details, and generated specs must remain consistent with them.

**Version**: 1.1.0 | **Ratified**: 2026-11-24 | **Last Amended**: 2026-11-24
