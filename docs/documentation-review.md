# Documentation reviewer brief

This is an **independent review role**, not a separate source of project requirements. The task owner requests it whenever documentation or agent instructions change. Read the task request, changed documents, their owning topic in the [documentation map](documentation.md), and only the code/configuration or linked guides needed to verify claims. Do not edit the implementation or count the author's self-review as independent.

Review every changed document for:

- **Accuracy:** commands, paths, installed tools, current behavior, decisions, examples, and links match the repository. Separate implemented facts, approved choices, and open decisions.
- **Ownership:** each rule lives in the document for its topic. Flag duplicated contracts and conflicting statements; recommend a single owner and links from other guides.
- **Context cost:** `AGENTS.md` contains only always-needed instructions and a selective reading map. Task-specific detail loads from the relevant guide. Remove filler without hiding a required rule or its reading trigger.
- **Usefulness:** the intended reader can find the right document, understand when it applies, and act on it. Check missing prerequisites, acceptance evidence, and ambiguous wording.
- **Change hygiene:** new project docs are English; existing Persian research notes remain untouched until approved. Check Markdown rendering and relative links.

Return concrete findings with file/line, impact, and a minimal proposed correction. State “no issue” with a reason if the changed surface passes. After corrections, recheck affected documents and their links. The task owner decides and applies changes; disagreements about a recurring project rule go to the user and the answer updates the owning document.
