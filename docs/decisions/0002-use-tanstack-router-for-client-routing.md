# 0002 — Use TanStack Router for client routing

- Status: Accepted
- Recorded: 2026-11-21

## Context and problem statement

MiniDesk is a small React SPA. To-do is the home page at `/`; Expenses, Focus,
and Real-user monitoring have their own routes. These pages currently show
coming-soon messages while feature behavior awaits specifications. Unknown
URLs need an understandable page. This route set does not require an SSR runtime.

## Decision drivers

- Keep URLs and navigation typed as the app grows.
- Keep feature behavior in its owner and `src/routes` as a thin adapter.
- Fit the existing Vite+ static build and Vercel Preview deployment.
- Leave a clear path to the approved TanStack Query data layer without choosing
  fetch, cache, or loader behavior before the feature specifications.

## Considered options

- **Manual History API routing:** enough for this small route set, but each new
  route would require application-owned matching, navigation, and URL typing.
- **React Router Declarative Mode:** a small fit for basic matching and links,
  with less built-in type checking of URL destinations in this mode.
- **React Router Data Mode:** adds loaders, actions, and pending states while
  retaining control of bundling and data; those capabilities are not needed by
  the current placeholder pages.
- **React Router Framework Mode:** offers typed route modules, code splitting,
  and SPA or SSR strategies, but adds a Vite plugin and framework conventions
  that this existing static build does not currently need.
- **TanStack Router:** supports generated route types and automatic code
  splitting with file-based routing, and can coordinate loaders with TanStack
  Query later. It adds a routing dependency and build plugin even for this small
  initial route set. Code-based routing was initially considered, but the
  project chose file-based routing for its generated types and route convention.

React Router's [mode guide](https://reactrouter.com/start/modes) describes its
three modes. The [TanStack Router file-based routing guide](https://tanstack.com/router/latest/docs/routing/file-based-routing)
and [external data loading guide](https://tanstack.com/router/latest/docs/guide/external-data-loading)
describe the route tree and coordination with external caches. These are
capabilities, not evidence that MiniDesk needs loaders or SSR today.

## Decision outcome

Use `@tanstack/react-router` with file-based routing and `@tanstack/router-plugin`.
`/` renders the To-do placeholder. `/expenses`, `/focus`, and
`/real-user-monitoring` render their feature placeholders. The root not-found
component belongs to `features/not-found`, explains an unknown URL, and links
home. The Vercel Build Output API serves existing static files
before rewriting unmatched paths to `index.html`, preserving direct SPA visits
and security headers; see the [configuration reference](https://vercel.com/docs/build-output-api/configuration).

TanStack Router's generated URL types and future compatibility with TanStack Query make it
a reasonable foundation for the planned pages. This is an architectural
preference, not a claim of measured superiority over React Router. The current
placeholder routes do not require complex data routing or SSR. Query behavior
will be decided when feature specifications provide real requirements.

## Consequences

- A router package, Vite plugin, and generated route tree are maintained for
  the four page routes.
- Feature pages must be connected through route adapters rather than placing
  feature behavior in the URL tree.
- Static hosting needs a filesystem-first fallback to `index.html`; a direct
  request for an unknown SPA URL returns the shell, then the client renders 404.
- The placeholder pages establish navigation; their actual behavior remains
  future feature work.
