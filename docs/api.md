# API and data boundary

This is the frontend remote-data guide. No frontend API client, feature endpoint, generated response type, mock server, or OpenAPI schema has been adopted here. T06 will establish the frontend-facing OpenAPI contract, generation command, validation policy, and example data. Until then, do not infer endpoints or response shapes from design images, planning notes, or backend source. Frontend agents do not need to inspect backend implementation or storage decisions.

## Decided request path

For **every remote operation**, use this direction:

```text
route adapter -> feature page -> feature hook/controller -> feature service
             -> feature endpoint -> shared transport
```

The page and feature UI present state and actions; they do not call the transport or endpoint. A feature hook/controller invokes its service. The service is mandatory even for a simple request and owns feature-level operations, mapping, or orchestration. The endpoint owns that feature's URL and request/response mechanics. `src/shared/api` owns only domain-neutral transport and, after a later decision, shared/generated API types. Pass cancellation/abort signals through every used layer when the operation supports cancellation. Source import boundaries belong to [architecture.md](architecture.md).

Treat the API as an external HTTP service. Use a same-origin relative API base initially and keep base URL configuration at the transport boundary so the service can later move to another origin. Frontend code must not import server handlers, database models, or secrets. T06 establishes the readable OpenAPI artifact and frontend-facing type generation.

## Query infrastructure

`@tanstack/react-query` is installed. The app bootstrap creates one stable `QueryClient` instance for the application lifetime and wraps the router with `QueryClientProvider`. It uses the library defaults; no global cache, retry, or refetch policy has been chosen without a real API.

TanStack Query manages server state. Local UI state such as modal visibility, selected tabs, and form input does not belong in its query cache.

When a feature has a real remote operation, its hook/controller owns the `queryOptions` or mutation configuration, query keys, and the decision about which queries to invalidate after a successful mutation. Include every variable that affects a query response in its key, including relevant identifiers, filters, pagination, and user or tenant scope. The hook calls its feature service; the service calls the feature endpoint; the endpoint uses shared transport. Keep request and response mapping out of the page, and pass TanStack Query's abort signal through the used layers where the operation supports cancellation. Decide feature-specific stale time, retries, invalidation, and error presentation from that API's behavior rather than setting an application-wide policy now.

Create actual files only when a real remote operation exists. The example paths in [architecture.md](architecture.md) are placement guidance, not a request for empty scaffolding. The feature owns its loading, empty, error, and success presentation. Do not put feature-specific messages or business rules in shared transport.

## Decisions still required before an API feature

| Question                                                              | Current state                                                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| API base URL/environment                                              | Same-origin `/api/minidesk/v1/` initially, with frontend transport base configurable.                       |
| Formal OpenAPI source and generation workflow                         | T06 decision; implementation waits for the frontend-facing contract.                                        |
| Generated types, their location, and regeneration                     | Not chosen.                                                                                                 |
| Runtime request/response validation strategy                          | Not chosen; decide from the OpenAPI contract.                                                               |
| Authentication and authorization behavior                             | MiniDesk is public with no accounts; future projects are outside this contract.                             |
| Feature cache policy, query keys, invalidation, and mutation handling | Query infrastructure is installed; concrete values and relationships wait for the first real API operation. |
| Mock and sample data strategy                                         | Not chosen; T09 may evaluate MSW after a data contract exists.                                              |

When a task needs one of these decisions, ask the user, record the answer in this document and the owning feature spec, then implement it. Do not turn a research suggestion into a contract by implication.
