# `@nordcom/commerce-convex`

The platform's Convex deployment: the schema, every table definition, and every
server function the apps call. If data persists anywhere in Nordcom Commerce, it
persists here.

Apps never import this package's functions directly — they go through the
service seam in [`@nordcom/commerce-db`](../db) (shops, users, sessions,
identities, reviews, feature flags) or the storefront's CMS getters (the
`cms/read` functions). What other workspaces *do* import:

| Subpath | Purpose |
| --- | --- |
| `./constructors` | `serverQuery`/`serverMutation`, `tenantQuery`/`tenantMutation`, `systemQuery`/`systemMutation` — the trust-tier function constructors. |
| `./_generated/api` | Typed function references for the deployed API. |
| `./_generated/server` | Generated server types (`Doc`, `Id`, ctx types). |

## Layout

```text
packages/convex/convex/
├── schema.ts          # defineSchema — composed by spreading tables/ groups; do not add tables here
├── tables/            # Table groups (shops, auth, reviews, cms*, revalidation, …)
│   └── cms.ts         # AUTO-GENERATED from the CMS descriptors by `pnpm cms:gen`
├── db/                # The packages/db seam: shops, shop_write (upsertShop), users, sessions, …
├── cms/               # Editor + read functions: documents (drafts/autosave/versions), read, media, …
├── revalidate/        # Publish → tag fanout → signed delivery to the storefront
├── auth/, account/    # Operator shop resolution + account profile surface
├── lib/               # Trust tiers (server/tenant/system), RLS, scan budgets, env
├── crons.ts           # Scheduled jobs (revalidation reconcile, …)
└── auth.config.ts     # JWT validation (CONVEX_AUTH_ISSUER / APPLICATION_ID / JWKS_URL)
```

## Trust tiers

Every public function is built with one of four constructors (`_constructors.ts`):

-   **`tenantQuery`/`tenantMutation`** — requires a validated end-user identity
    (the NextAuth-derived RS256 JWT) and resolves the caller's shop membership.
-   **`authedQuery`/`authedMutation`** — requires a validated identity but no
    shop membership; the customer tier behind the storefront account surface
    (`account/profile`).
-   **`serverQuery`/`serverMutation`** — admits an identity-less server caller
    only when it presents `CONVEX_SERVER_SECRET`; used by the `packages/db` seam
    for pre-tenant reads (`Shop.findByDomain` in middleware) and the Auth.js
    adapter.
-   **`systemQuery`/`systemMutation`** — internal/cron surfaces.

## Conventions

-   **Tables are added per group** under `tables/<group>.ts` and spread into
    `tables/index.ts` — never directly into `schema.ts`.
-   **Tenant-scoped tables index the shop key first** (`by_shop`, `by_shop_<field>`).
-   **`tables/cms.ts` and `cms/localized_paths.ts` are generated** — edit the CMS
    descriptors in `packages/cms` and run `pnpm cms:gen` instead.
-   **Errors are `ConvexError`s with stable codes** so seam callers branch on a
    code, never on message text.

## Scripts

```bash
pnpm convex:dev       # (root) boot/attach the anonymous local backend + push schema
pnpm convex:deploy    # (root) deploy to the configured deployment (CI: CONVEX_DEPLOY_KEY)
pnpm convex:env       # (root) manage deployment env vars
pnpm --filter @nordcom/commerce-convex codegen     # refresh convex/_generated
pnpm --filter @nordcom/commerce-convex test        # convex-test unit suites
```

The deployment needs its own env vars set via `convex env set`:
`CONVEX_AUTH_ISSUER`, `CONVEX_AUTH_APPLICATION_ID`, `CONVEX_AUTH_JWKS_URL`,
`CONVEX_SERVER_SECRET`, and `CONVEX_REVALIDATE_SECRET`.

Build-time: `scripts/build.mjs` runs codegen only when `CONVEX_DEPLOYMENT` or
`CONVEX_DEPLOY_KEY` is set, falling back to the committed `convex/_generated`
otherwise; the deploy dry-run also accepts `CONVEX_AGENT_MODE=anonymous` (CI's
ephemeral local backend) as a configured target.

## Testing

Unit tests run in-memory via `convex-test` (no backend). Boundary behavior
against a REAL local backend — document-size ceilings, scan budgets, autosave
OCC under concurrency — lives in
[`packages/test-convex/src/limits`](../test-convex), which CI runs whenever this
package changes.
