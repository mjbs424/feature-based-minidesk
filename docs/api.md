# API and data boundary

This is the frontend remote-data guide. The [MiniDesk OpenAPI document](../openapi/minidesk.v1.json) is the frontend-facing HTTP contract. Edit the YAML files in [openapi/source](../openapi/source/): `core.yaml` owns metadata, shared responses, demo, and categories; the other files own Tasks, Expenses, Focus, and RUM. The [generator](../openapi/generate.mjs) combines them and passes the contract to Hey API. Run `pnpm run api:generate` to refresh the standalone OpenAPI document and [generated client, SDK, and types](../src/shared/api/generated/). `pnpm run api:check` fails when any generated artifact is stale and runs in CI. Future frontend feature work reads the OpenAPI artifact, not backend source or storage details.

The OpenAPI document is the source for endpoint, header, query, body, success, and error shapes. Product behavior such as sorting, reset, and focus time allocation remains in the [product blueprint](product-api-frontend-blueprint.md) until feature specs take ownership. The JSON example below illustrates a possible response, not seeded demo data:

```json
{
  "datasetId": "example-generation",
  "timeZone": "UTC",
  "currency": "USD",
  "serverNow": "2026-11-26T10:00:00.000Z",
  "resetAt": "2026-11-26T12:00:00.000Z"
}
```

Hey API generates the fetch transport, endpoint functions, and compile-time types. The checked-in generator only parses and joins feature YAML, checks references, and compares generated output; do not edit the generated directory by hand. The pinned Hey API prerelease supports the app's TypeScript 7 toolchain; reassess the pin when a compatible stable release is available. Do not add blanket runtime parsing of every successful response to the browser. Validate untrusted user input at the feature boundary and let the backend validate all writes. Use contract checks and targeted API tests to catch backend drift; TypeScript alone cannot prove that a deployed response matches the schema. Revisit runtime response validation if the API moves to an independently deployed or less trusted service.

## Decided request path

For **every remote operation**, use this direction:

```text
route adapter -> feature page -> feature hook/controller -> feature service
             -> feature endpoint -> shared transport
```

The page and feature UI present state and actions; they do not call the transport or endpoint. A feature hook/controller invokes its service. The service is mandatory even for a simple request and owns feature-level operations, mapping, or orchestration. The endpoint owns that feature's request/response mechanics and calls the corresponding generated SDK function. `src/shared/api/generated` owns the generated transport, SDK, and types. Pass cancellation/abort signals through every used layer when the operation supports cancellation. Source import boundaries belong to [architecture.md](architecture.md).

Treat the API as an external HTTP service. [The generated client](../src/shared/api/generated/client.gen.ts) defaults to the same origin. A feature endpoint calls its [generated SDK function](../src/shared/api/generated/sdk.gen.ts) with typed path, query, header, and body options; the generated function supplies the OpenAPI path. Pass a `client` created with a different `baseUrl` in the function options if the service moves. The endpoint handles the returned `{ data, error, response }`; it must not treat an HTTP error as success. A network rejection and a non-2xx response are separate error cases. Pages do not call the SDK directly. Frontend code must not import server handlers, database models, or secrets.

Load `/api/minidesk/v1/demo` when the first remote feature needs demo context. Keep the result in the application-lifetime query cache, share an in-flight fetch between callers, and reuse its `datasetId` in `X-Minidesk-Dataset-Id` for subsequent writes. Do not persist it in browser storage or fetch demo before every write. When the known `resetAt` has passed or the server returns `409 DATASET_RESET`, fetch a fresh context before another write, cancel and clear queries from the old generation, refetch the active feature, discard stale editing state, and let the user retry. Include `datasetId` in feature query keys and ignore late responses started under an older generation so they cannot restore stale data. Pass query abort signals through the feature layers to the generated request. An in-flight write may finish before a reset and then disappear with that generation, or receive `DATASET_RESET` if the reset happened first; do not automatically replay it. Implement this coordination with the first remote feature; it is not present in the frontend yet.

Mutations of an existing resource (updates, deletes, budget replacement, and focus action POSTs) send `If-Match` with the quoted `version` already returned with that resource; they do not need an extra read solely to construct this header. A first budget `PUT` has no `If-Match`. On `409 CONFLICT`, refetch the affected resource and present the conflict. `Idempotency-Key` is optional for creates and focus actions: when using it, generate a new key for each intended operation and reuse that key only to retry the same request. Do not automatically replay a mutation after a network timeout. Focus action POSTs send `{}`. The public API has no authentication.

## Query infrastructure

`@tanstack/react-query` is installed. The app bootstrap creates one stable `QueryClient` instance for the application lifetime and wraps the router with `QueryClientProvider`. It uses the library defaults; no global cache, retry, or refetch policy has been chosen without a real API.

TanStack Query manages server state. Local UI state such as modal visibility, selected tabs, and form input does not belong in its query cache.

When a feature has a real remote operation, its hook/controller owns the `queryOptions` or mutation configuration, query keys, and the decision about which queries to invalidate after a successful mutation. Include every variable that affects a query response in its key, including relevant identifiers, filters, pagination, and user or tenant scope. The hook calls its feature service; the service calls the feature endpoint; the endpoint uses shared transport. Keep request and response mapping out of the page, and pass TanStack Query's abort signal through the used layers where the operation supports cancellation. Decide feature-specific stale time, retries, invalidation, and error presentation from that API's behavior rather than setting an application-wide policy now.

Create actual files only when a real remote operation exists. The example paths in [architecture.md](architecture.md) are placement guidance, not a request for empty scaffolding. The feature owns its loading, empty, error, and success presentation. Do not put feature-specific messages or business rules in shared transport.

## API decisions and pending feature choices

| Question                                                              | Current state                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API base URL/environment                                              | Same-origin `/api/minidesk/v1/` initially, with frontend transport base configurable.                                                                         |
| Formal OpenAPI source and generation workflow                         | `openapi/source/*.yaml` is authored; `openapi/generate.mjs` builds `openapi/minidesk.v1.json` and invokes Hey API. Run `pnpm run api:generate` / `api:check`. |
| Generated client, SDK, types, and regeneration                        | `src/shared/api/generated/`, regenerated with the contract.                                                                                                   |
| Runtime request/response validation strategy                          | Backend validates writes; frontend uses generated compile-time types and contract checks, without blanket response parsing.                                   |
| Authentication and authorization behavior                             | MiniDesk is public with no accounts; future projects are outside this contract.                                                                               |
| Feature cache policy, query keys, invalidation, and mutation handling | Query infrastructure is installed; concrete values and relationships wait for the first real API operation.                                                   |
| Mock and sample data strategy                                         | Not chosen; T09 may evaluate MSW after a data contract exists.                                                                                                |

When a task needs an unsettled decision, record the answer in this document and the owning feature spec before implementing dependent behavior. Do not turn a research suggestion into a contract by implication.
