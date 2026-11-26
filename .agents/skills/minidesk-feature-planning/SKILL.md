---
name: minidesk-feature-planning
description: Use when the user proposes a MiniDesk feature, asks to refine one of the four planned pages, or requests a project phase or feature tasks. Coordinate Superpowers discovery with Spec Kit specification, planning, and task breakdown under MiniDesk's existing architecture and UI system.
---

# MiniDesk feature planning

1. Read `AGENTS.md`, `docs/feature-delivery.md`, and only the relevant topic guides. Inspect current frontend implementation and visual references; distinguish actual UI from planned work. Treat the API as an external service and use the T06/OpenAPI contract for data details when it is available; do not inspect demo backend source for feature planning.
2. Use `brainstorming` when product intent or behavior needs refinement. Do not repeat questions answered by the request or docs. Record material choices in the feature spec; label unapproved ideas. A proposed technology outside the current stack becomes a separate optional decision task.
3. Use Spec Kit's `speckit-specify`, `speckit-plan`, `speckit-tasks`, and `speckit-analyze` workflow, with `speckit-clarify` for unresolved material choices. Keep generated artifacts under `specs/<feature>/`. Respect `docs/feature-delivery.md` for project phase and task IDs. Treat Spec Kit's internal phases as ordering within the feature.
4. Before releasing tasks, follow `docs/architecture.md#ui-foundation` to map controls to reuse, extension, or a justified new component. Map data and API work only to approved contracts. Give each task prerequisites, exact files, acceptance evidence, and relevant checks.
5. When the user assigns tasks, work only on those tasks. Apply relevant Superpowers execution, debugging, verification, and review skills; follow `docs/agent-workflow.md` for branch and handoff behavior. Update task status from observed evidence.
