# UI direction and reference assets

The images below are the visual references supplied for the planned To-do, Expenses, and Focus pages. They guide future implementation; the current starter page does not implement them. Use the images for visual hierarchy, palette, density, and navigation. Do not treat generated text, totals, timestamps, or decorative controls in an image as a validated functional contract. Resolve behavior in the feature spec with the user.

| Feature  | Desktop light                                     | Desktop dark                                    | Mobile light                                             | Mobile dark                                            |
| -------- | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| To-do    | [light](../public/todo-list-light-design.png)     | [dark](../public/todo-list-dark-design.png)     | [light](../public/mobile-todo-list-light-design.png)     | [dark](../public/mobile-todo-list-dark-design.png)     |
| Expenses | [light](../public/expenses-list-light-design.png) | [dark](../public/expenses-list-dark-design.png) | [light](../public/mobile-expenses-list-light-design.png) | [dark](../public/mobile-expenses-list-dark-design.png) |
| Focus    | [light](../public/focus-list-light-design.png)    | [dark](../public/focus-list-dark-design.png)    | [light](../public/mobile-focus-list-light-design.png)    | [dark](../public/mobile-focus-list-dark-design.png)    |

`todo-list-dark-design2.png` is an earlier dark To-do alternative, not the selected design. The selected dark desktop reference has the preferred bright violet side rail, but its rightmost controls are cropped. **Implement a comfortable right inset consistent with the other desktop designs; never reproduce that crop.**

These reference PNGs are in `public/` at the user's request, so Vite copies them into the deployment even though the app does not display them. They currently total about 19 MiB. The bundle-size check measures built JS/CSS, and the current Lighthouse check visits only the starter route; neither reports this reference-asset cost. Keep the files as documentation references, do not load them in application UI, and optimize or replace any image selected for actual runtime use as part of that feature's performance review.

## Shared visual rules

- Light surfaces are warm white and pale neutral, with dark text, a deep emerald active color, subtle borders, and small peach/orange secondary accents. Dark surfaces are deep charcoal/plum, with soft white and lavender text, vivid violet/magenta active color, and restrained warm secondary accents. Treat these as visual direction, not exact approved hex tokens.
- Desktop uses a narrow icon rail, an adjacent feature navigation sidebar, a top utility area, summary/action controls, and compact list sections. Distinguish the active feature through visual styling and an accessible navigation state. Keep visible insets on both edges, including the right edge in dark mode.
- Mobile is its own composition: small status/utility area, simple hamburger navigation, compact summary, two-column quick views, and readable list sections. Do not shrink the desktop sidebar or table into the phone view. Keep cards and actions comfortably inset and preserve bottom safe-area space.
- To-do rows express completion; Expenses rows express transactions and amounts; Focus shows a timer, priority tasks, and session history. Avoid transplanting task checkboxes into expense or session history rows.
- Use the shared semantic Tailwind/shadcn/ui tokens in `src/styles/index.css` for surfaces, text, actions, navigation, borders, and focus. The light tokens start with warm neutrals and emerald actions; the dark tokens start with plum surfaces and violet actions. These are implementation starting values, not a claim that the reference layouts are built or their exact colors approved. Extend semantic roles when a real screen needs them rather than hard-coding colors independently in every component. Add shadcn/ui components only when a real screen needs them.

## Theme and accessibility decisions

The app follows the operating system's light or dark preference, including changes while it is open. A manual theme control and persistence belong to future UI work; do not add them to the starter screen. Check the rendered result in both modes when implementing a feature.

Use at least WCAG AA contrast for text (4.5:1, or 3:1 for large text) and essential non-text controls and focus indicators (3:1). Keep focus visible, keyboard controls operable, and names and states available to assistive technology. The active navigation item needs a visible distinction and an accessible state such as `aria-current="page"`. Touch targets should meet the 24 by 24 CSS-pixel minimum or its spacing exception; aim for larger targets on mobile. Verify these rules on actual components, including disabled, selected, loading, empty, and error states; token contrast alone does not establish page accessibility.

## Interaction and quality

Do not rely on color alone for selected, completed, warning, or error states; provide meaningful status text. Confirm responsive widths and content overflow in the rendered browser; images are visual targets, not layout tests. Preserve loading, empty, error, and success states when a feature's data flow requires them, using the relevant feature specification for exact wording and behavior. If a design reference and an approved spec disagree, ask before making a repeatable product choice and update the owning document.

When a visual decision or reference asset changes, review and update this guide in the same PR.
