# Product direction

MiniDesk is a small, feature-based React application with four planned pages: To-do, Expenses, Focus, and Real-user monitoring. The routes currently show coming-soon pages, with To-do at `/`. The design images in `public/` show a proposed look for the first three pages; they do not establish completed functionality.

| Area                 | User purpose                               | Scope known now                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| To-do                | See and organize tasks and their progress. | A task list is the first visual focus. The references show today, upcoming, completion, categories, and an add action. Exact create/edit/delete behavior, persistence, and data source require a feature specification. |
| Expenses             | Review spending and understand a budget.   | The references show transaction lists, a monthly budget summary, category breakdowns, and an add action. Currency rules, recurring behavior, persistence, and aggregation semantics require a feature specification.    |
| Focus                | Start a focus session and review progress. | The references show a timer, priority tasks, focused-time summary, and recent sessions. Timer lifecycle, background behavior, task association, and persistence require a feature specification.                        |
| Real-user monitoring | Monitor the experience of real users.      | The page is planned, but its metrics, data source, collection method, and behavior require a feature specification.                                                                                                     |

Implement a feature from its approved spec, not from image text or illustrative numbers. For each feature, define the user journey, data ownership, empty/loading/error/success states where applicable, keyboard and mobile behavior, and acceptance evidence before committing to functionality. Spec Kit is installed for this work, but no feature spec has yet approved the unresolved behavior above. Put feature specifications under `specs/<feature>/` as described in [documentation.md](documentation.md). The selectable project phases and task prerequisites are in [feature-delivery.md](feature-delivery.md).

Research reports inform planning; they are not approved feature specifications.
