# Vercel agent skills in MiniDesk

This guide owns when and how the three installed Vercel skills are used in this React 19, Vite+ SPA. The upstream copies live under `.agents/skills/`; `skills-lock.json` records their source commit and content hashes. Review upstream changes before updating those copies. The skills are review guidance, not runtime dependencies or CI gates. [Architecture](architecture.md), [API](api.md), [development checks](development.md), and measured behavior remain the project contracts.

## React performance

Read [Vercel React Best Practices](../.agents/skills/vercel-react-best-practices/SKILL.md) for a React component, client data flow, bundle, or performance task. Read only the relevant `rules/` files. Start from an observed issue or a concrete risk in the change, then check the proposed rule against the current code and measure the result when it affects performance.

- For genuinely independent requests, consider `async-parallel`. Preserve the feature's endpoint/service ownership, TanStack Query behavior, and `AbortSignal` path. Do not add SWR because `client-swr-dedup` mentions it.
- For a measured heavy or rarely used client module, consider Vite `import()` or `React.lazy` with an appropriate loading boundary. TanStack Router already splits route code; inspect the build chunks before adding another boundary. Do not copy `next/dynamic` or `next/link` examples into this SPA.
- Derive state during render when possible and keep interaction logic in event handlers. React Compiler is enabled, so add manual `memo`/`useMemo` only for a demonstrated case that still benefits from it. Use React Doctor and the relevant checks as additional evidence.
- Do not apply the skill's server, RSC, SSR hydration, server action, ISR, or API route rules to this client-only app. Do not rewrite low-level JavaScript without a measured hot path.

## Component composition

Read [Vercel Composition Patterns](../.agents/skills/vercel-composition-patterns/SKILL.md) when a real component API accumulates independent boolean modes, complex shared state, or reusable variants. Read the matching `rules/` files before changing the API. Composition is a choice for a concrete component, not a requirement to create providers or compound components for simple pages. Keep feature behavior in its owning feature; move only domain-neutral contracts to `shared/ui`.

The installed React 19 rule combines advice about `forwardRef` and `use()`. Verify each proposed change against the current React API and the component contract. `useContext()` remains valid; do not replace it project-wide merely because the skill mentions `use()`.

## Vercel optimization

[Vercel Optimize](../.agents/skills/vercel-optimize/SKILL.md) and its [cross-agent entry point](../.agents/skills/vercel-optimize/AGENTS.md) are installed for an explicit production cost or deployment performance investigation. Read its prerequisites before running any bundled script. It requires an authenticated, correctly linked Vercel project, a compatible CLI, and production signals; route-level analysis requires Observability Plus. Confirm the intended Vercel project and account scope before collecting metrics. Do not put credentials in commands or reports.

The upstream framework preflight does not list Vite as supported. Its default path therefore stops for this app. Run its limited platform/scanner path only after the user explicitly accepts that limitation for a specific audit; do not present route-to-source recommendations as supported by the skill. The existing Preview Lighthouse and bundle checks in [development](development.md) remain the routine performance checks. No Vercel metrics audit has been run for this adoption.