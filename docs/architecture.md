# Frontend architecture

The application is organized by feature. Add only folders that a feature needs;
the example below is a placement guide, not a requirement to create empty folders.

```text
src/
  app/                         # Bootstrap and top-level providers
  routes/                      # File-based URL tree and thin route adapters
  features/
    to-do/                     # Example feature; use the same shape for expenses, focus, etc.
      ToDoPage.tsx              # Page composition and visible UI
      components/               # UI specific to To-do
      hooks/to-do.hooks.ts      # Query/mutation hooks and query keys when needed
      api/to-do.endpoints.ts    # HTTP calls and endpoint paths
      api/to-do.service.ts      # Feature-specific response mapping and operations
      schemas/                  # Runtime validation and form schemas specific to To-do
      model/                    # Feature-specific types and domain logic
      lib/                      # Feature-specific utilities, when needed
  shared/
    api/                       # HTTP transport; generated types after T06 decision
    ui/                        # Reusable, domain-neutral components when needed
    lib/                       # Domain-neutral utilities
    config/                    # Shared configuration
    assets/                    # Shared static assets
  i18n/                        # Shared localization infrastructure, when needed
  styles/                      # Global styles and tokens
tests/                         # Cross-feature and browser tests (T07–T14)
public/                        # Assets copied unchanged by the build
api/                           # Previously proposed; purpose to decide in T06
openapi/                       # Previously proposed schema source; decide in T06
```

Keep unit and component tests next to the code they exercise. The `tests/`
directory is for flows that span features or run in a browser.

## UI foundation

Tailwind CSS is integrated through the Vite plugin. Semantic shadcn/ui theme
tokens live in `src/styles/index.css`; palette and theme behavior are specified
in [design.md](design.md). `components.json` directs
generated, domain-neutral UI components to `src/shared/ui`. Add each component
when a real page needs it; keep feature-
specific composition and behavior inside the owning feature. Review generated
components for accessibility in their actual use, including keyboard behavior,
labels, focus states, and contrast.

The planned page appearances are documented in [design.md](design.md) and the
reference images in `public/`. The current coming-soon pages are not the final
visual implementation.

## Ownership and naming

`src/app` owns application bootstrap, the single stable TanStack Query client and
provider, and top-level composition.
`src/routes` owns URL-to-page adapters, not feature behavior. Each feature owns its
page, feature-specific UI, domain rules, state, validation, and API operations.
`shared` is for code that is independent of any feature's domain vocabulary;
similar-looking feature code does not move there until a genuinely common contract
is clear. A shared component takes data and callbacks through its public API
instead of importing feature code. Do not use `shared` as a re-export path around
the feature import rules.

Use lowercase kebab-case for feature directories and URL segments, and PascalCase
for React components. Give modules names that describe their role within the
feature, such as `tasks.endpoints.ts`; keep tests beside the code they cover.
Create folders only when they contain real code. Cross-feature imports remain
forbidden even if both features happen to use the same data shape.

## Route contract

TanStack Router uses file-based routing. `src/routes/__root.tsx` supplies the
outlet and the not-found feature; `src/routes/index.tsx` connects `/` to the
To-do feature. The Vite plugin generates `src/routes/routeTree.gen.ts`,
which should be committed so TypeScript checks can run before a build. Do not
edit the generated file. `src/app/router.tsx` creates the router and `src/app/main.tsx`
mounts it. The root route handles unmatched URLs with a page-not-found message
and a link to `/`. This decision is recorded in [ADR 0002](decisions/0002-use-tanstack-router-for-client-routing.md).

For each feature page, `src/routes` connects its URL to a page exported
by the owning feature. Route adapters may read and validate URL parameters and
choose loading or error boundaries; they do not contain domain behavior or issue
API requests. A feature page receives the route values it needs and owns the
page's behavior.

URLs use lowercase kebab-case segments; stable identifiers go in path parameters
and transient view state may go in search parameters. The current routes are
`/` for To-do, `/expenses`, `/focus`, and `/real-user-monitoring`. They show
coming-soon pages until their feature specifications define behavior. The plugin
is enabled for automatic route code splitting. Vite+ Oxfmt excludes the generated
route tree through `fmt.ignorePatterns` in `vite.config.ts` because the router
plugin owns that file's formatting. The Vercel Build Output API checks static files before
rewriting unmatched paths to `/index.html`, so a direct browser visit can reach
the client router.

## Dependencies

`app` and `routes` may compose features and use shared infrastructure.
Routes should only connect URLs to feature pages; route behavior belongs to the
feature. A feature may import its own files, `shared`, `i18n`, and `styles`.
It must not import another feature. `shared`, `i18n`, and `styles` may depend on
each other but never on a feature or the app. Move genuinely reusable behavior
into `shared` without placing feature-specific domain code there.

The `boundaries/dependencies` rule in Vite+ Oxlint enforces these source import
directions for TypeScript and JavaScript. `no-unknown-files` and
`no-unknown-dependencies` catch files and local imports that escape the declared
structure. Keep the TypeScript import resolver configured when introducing path
aliases so unresolved aliases cannot bypass these checks. The existing
`vp check` pre-commit and CI steps run the same lint configuration.
`no-ignored-dependencies` also rejects source imports that resolve outside the
included source and installed-package paths. Package paths are included for
classification because the rule otherwise mistakes ordinary package imports
for ignored local files.

When changing import-boundary rules or their include scope, audit affected imports and checks, and update this contract in the same PR.

## API ownership

Each feature owns its remote operations; `shared/api` is for domain-neutral
transport and, after a contract decision, shared types. The mandatory request
path, layer responsibilities, approved TanStack Query choice, and open schema
decisions live in [api.md](api.md). Create files only when a real operation needs
them. The previously proposed top-level `api/` and `openapi/` directories are
possibilities for T06, not folders to create before that decision.
