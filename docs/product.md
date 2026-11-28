# Product direction

MiniDesk is a small, feature-based React application with four planned pages: To-do, Expenses, Focus, and Real-user monitoring. The routes currently show coming-soon pages, with To-do at `/`. The design images in `public/` show a proposed look for the first three pages; they do not establish completed functionality.

The approved feature rules and 12-hour shared-demo reset are in [the product and API planning contract](product-api-frontend-blueprint.md). The [OpenAPI document](../openapi/minidesk.v1.json) defines frontend-facing HTTP shapes. [Feature delivery](feature-delivery.md) owns the project phases; frontend feature work does not inspect the demo backend implementation. Per-feature Spec Kit artifacts are still to be produced.

| Area                 | User purpose                               | Scope known now                                                                                                                                                         |
| -------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| To-do                | See and organize tasks and their progress. | The blueprint defines task CRUD, categories, filters, priority, and API data. The per-feature Spec Kit artifacts still need to be produced.                             |
| Expenses             | Review spending and understand a budget.   | The blueprint defines USD expenses, categories, a temporary monthly budget, aggregation, and API data. The per-feature Spec Kit artifacts still need to be produced.    |
| Focus                | Start a focus session and review progress. | The blueprint defines one shared 25-minute timer, optional linked-task completion, history, and API data. The per-feature Spec Kit artifacts still need to be produced. |
| Real-user monitoring | Monitor site performance and page views.   | The blueprint defines non-personal event collection and aggregate display. The per-feature Spec Kit artifacts still need to be produced.                                |

Implement a frontend feature from its approved per-feature spec, using the blueprint for product behavior and the OpenAPI artifact for remote data. Do not use image text or illustrative numbers as live data. For each feature, record the user journey, empty/loading/error/success states where applicable, keyboard and mobile behavior, and acceptance evidence before implementing it. Spec Kit is installed, but its feature artifacts have not yet been produced. Put them under `specs/<feature>/` as described in [documentation.md](documentation.md). The selectable project phases and task prerequisites are in [feature-delivery.md](feature-delivery.md).

Research reports inform planning; they are not approved feature specifications.
