# Frontend architecture

The application is organized by feature. Add only folders that a feature needs;
the example below is a placement guide, not a requirement to create empty folders.

```text
src/
  app/                         # Bootstrap and top-level providers
  routes/                      # URL definitions and thin route adapters (T04)
  features/
    tasks/                     # Example feature; use the same shape for expenses, focus, etc.
      TasksPage.tsx             # Page composition and visible UI
      components/               # UI specific to tasks
      hooks/tasks.hooks.ts      # Query/mutation hooks and query keys
      api/tasks.endpoints.ts    # HTTP calls and endpoint paths
      api/tasks.service.ts      # Feature-specific response mapping and operations
      schemas/                  # Runtime validation and form schemas specific to tasks
      model/                    # Feature-specific types and domain logic
      lib/                      # Feature-specific utilities, when needed
  shared/
    api/                       # HTTP transport, generated API types/client (T06)
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
Fallow ignores the TypeScript import resolver's unused-dependency warning:
Oxlint loads that package by its `typescript` resolver name from configuration.

## API ownership

`shared/api` owns the reusable HTTP client and cross-feature API types; it
must not contain endpoint operations for a specific feature. A feature owns its
endpoint calls, service transformations, hooks, query keys, cache policy, and
mutation invalidation. Pages consume hooks and render states. Services call
endpoints, while hooks use services and own TanStack Query integration when T05
is implemented. Preserve abort signals through the hook, service, and endpoint
layers.

T06 will decide the source of the OpenAPI schema, generation command, generated
file location under `shared/api`, and how runtime validation relates to
generated types. The previously proposed top-level `api/` and `openapi/`
directories are reserved names, not folders to create before that decision;
this frontend does not assume a backend implementation in this repository.
