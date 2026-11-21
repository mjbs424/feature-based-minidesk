# Frontend architecture

The application is organized by feature. Add only folders that a feature needs;
the example below is a placement guide, not a requirement to create empty folders.

```text
src/
  app/                         # Bootstrap and top-level providers
  routes/                      # URL definitions and thin route adapters (T04 setup pending)
  features/
    tasks/                     # Example feature; use the same shape for expenses, focus, etc.
      TasksPage.tsx             # Page composition and visible UI
      components/               # UI specific to tasks
      hooks/tasks.hooks.ts      # Query/mutation hooks and query keys when needed
      api/tasks.endpoints.ts    # HTTP calls and endpoint paths
      api/tasks.service.ts      # Feature-specific response mapping and operations
      schemas/                  # Runtime validation and form schemas specific to tasks
      model/                    # Feature-specific types and domain logic
      lib/                      # Feature-specific utilities, when needed
  shared/
    api/                       # HTTP transport; generated types after T06 decision
    ui/                        # Reusable, domain-neutral components (T03)
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
tokens live in `src/styles/index.css`, with neutral light values and a `.dark`
variant that follows the operating system preference. `components.json` directs
generated, domain-neutral UI components to `src/shared/ui`. Add each component
when a real page needs it; keep feature-
specific composition and behavior inside the owning feature. Review generated
components for accessibility in their actual use, including keyboard behavior,
labels, focus states, and contrast.

The planned page appearances are documented in [design.md](design.md) and the
reference images in `public/`. The current neutral theme tokens and starter
page are not the final visual implementation.

## Ownership and naming

`src/app` owns application bootstrap, global providers, and top-level composition.
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

The current application has only its starter page. TanStack Router is the
approved routing library, but it is not installed yet; T04 will set it up.
When a real page is added,
`src/routes` connects its URL to a page exported by the owning feature. Route
adapters may read and validate URL parameters and choose loading or error
boundaries; they do not contain domain behavior or issue API requests. A feature
page receives the route values it needs and owns the page's behavior. `src/app`
mounts the router and providers when T04 configures TanStack Router.

URLs use lowercase kebab-case segments; stable identifiers go in path parameters
and transient view state may go in search parameters. Define the actual URLs,
404 behavior, lazy-loading strategy, and router-specific file conventions with
the first real routes in T04. Do not create placeholder route files before then.

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

Fallow ignores the TypeScript import resolver's unused-dependency warning:
Oxlint loads that package by its `typescript` resolver name from configuration.

## API ownership

`shared/api` owns the reusable HTTP client and, after a contract decision,
cross-feature API types; it
must not contain endpoint operations for a specific feature. A feature owns its
endpoint calls, service transformations, hooks, query keys, cache policy, and
mutation invalidation. Pages render feature state and actions. Every remote
operation goes through a feature service, which calls a feature endpoint.
Feature hooks or controllers call the service, never the endpoint directly.
TanStack Query is the approved data library but is not installed yet; T05
defines its query keys, cache, and mutation integration. Preserve abort
signals through every layer used by an operation.

For a feature that needs remote data, the flow is page to feature hook or
controller, then feature service, feature endpoint, and shared transport.
Feature components may keep local UI state and receive data or callbacks, but
should not know transport URLs or perform requests directly. Services own
feature-level mapping and orchestration; endpoints own feature URLs and
request/response details; shared transport owns generic request behavior and
must not encode a feature's business rules. Create these files when the first
real remote operation exists, rather than adding empty placeholders. Handle
loading, empty, error, and success states at the feature boundary, with
domain-specific error messages owned by the feature. T06 will settle the
schema source and generated API types. See [api.md](api.md) for decided and
open contracts.

T06 will decide whether OpenAPI is the contract format, the schema source,
generation command, generated file location, and how runtime validation
relates to generated types. The previously proposed top-level `api/` and
`openapi/` directories are reserved names, not folders to create before that
decision; this frontend does not assume a backend implementation here.
