# `@nordcom/commerce-db`

The typed data-access seam for the Nordcom Commerce platform. Every app reads and
writes shops, users, sessions, identities, reviews, and feature flags through the
service instances exported here; the services translate those calls onto the Convex
deployment defined in [`packages/convex`](../convex). No other workspace talks to
Convex's `db/*` functions directly.

> **Server-only.** The package is marked `'server-only'`. The Convex clients are
> constructed lazily, but calling any service without `CONVEX_URL` (and, for the
> identity-less paths, `CONVEX_SERVER_SECRET`) in the environment will throw a
> `MissingEnvironmentVariableError`.

## Install

This package is a workspace package — consume it via `workspace:*`:

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-db": "workspace:*"
    }
}
```

It is built with Vite to `dist/` and consumed by both apps and other packages. Run
`pnpm build:packages` from the repo root in a fresh checkout — apps depend on the
emitted `dist/`, not the source.

## Usage

```ts
import { Shop, User } from '@nordcom/commerce-db';

// Find a tenant by its public hostname (used in the storefront middleware).
const shop = await Shop.findByDomain('nordcom-demo-shop.com');

// Lookup a user by id.
const user = await User.find({ id: someId });

// Find every shop a given user can administer.
const shops = await Shop.findByCollaborator({ collaboratorId: user.id });
```

`Shop`, `User`, etc. are **service instances**. They keep the uniform
`find` / `create` / `findOneAndUpdate` API the platform has always used and add
per-domain helpers like `Shop.findByDomain` and `Shop.findByCollaborator`. Single-doc
lookups that miss throw `NotFoundError` — callers that want `null` use
`findById`.

### Sensitive data

By default, sensitive fields (e.g. `collaborators`, provider tokens) are **absent**
from `find` results — provider credentials are stored split-out in the Convex
`shopCredentials` table and only re-attached on the server-trusted opt-in read:

```ts
const shop = await Shop.findByDomain(domain, { sensitiveData: true });
```

Never expose the result of a `sensitiveData: true` call to client components — the
re-attached tokens are taint-guarded.

## How a call reaches Convex

`src/db.ts` exposes two client tiers, both lazy:

-   **Identity clients** (`convexIdentityQuery` / `convexIdentityMutation`) attach the
    caller's NextAuth-derived RS256 JWT, so the Convex functions see a real
    `ctx.auth` identity and enforce per-tenant access.
-   **Server-trust clients** (`convexServerQuery` / `convexServerMutation`) present
    `CONVEX_SERVER_SECRET` instead. They exist for the identity-less seams: pre-tenant
    reads (`Shop.findByDomain` in middleware runs before any session exists) and the
    Auth.js adapter's platform-global user/session/identity access.

Each service delegates to a `ServiceBackend` (`src/services/service.ts`) that
translates the frozen seam vocabulary — plain field filters, `$elemMatch`/`$push`
operator objects, dotted projection paths — into calls against the deployed `db/*`
Convex functions. Unsupported filter shapes throw rather than silently returning
wrong rows. Shop writes funnel through the atomic `db/shop_write:upsertShop`
mutation.

## Document shape

Every document exposes a string `id` (the public id — for migrated rows this is the
preserved legacy id, never the raw Convex `_id`) plus `Date`-typed
`createdAt` / `updatedAt`:

```ts
type BaseDocument = { id: string; createdAt: Date; updatedAt: Date };
```

The entity types (`ShopBase`, `OnlineShop`, `UserBase`, `SessionBase`,
`IdentityBase`, `ReviewBase`, `FeatureFlagBase`) live under `src/models/` as plain
TypeScript types; the corresponding Convex table validators live in
[`packages/convex/convex/tables/`](../convex/convex/tables/) and must stay in sync.

## Layout

```text
packages/db/
└── src/
    ├── db.ts                # Lazy Convex clients (identity + server-trust tiers)
    ├── index.ts             # Public re-exports + shared utility types
    ├── models/              # Entity types (ShopBase, UserBase, …) + query-type aliases
    ├── services/            # Service classes — the frozen seam surface
    │   ├── service.ts       # Service base + the ServiceBackend contract
    │   ├── service-seam-contract.snapshot.ts  # Pinned signatures (do not edit)
    │   ├── shop.ts user.ts session.ts identity.ts review.ts feature-flag.ts
    │   └── index.ts
    └── lib/                 # Pure leaves: theme tokens, feature-flag keys, doc serializers
```

`src/lib/doc-to-shape.ts` owns the `OnlineShop` serialization, including the
credential masking (`commerceProvider.authentication.token`,
`customers.clientSecret`) every consumer relies on.

## Scripts

```bash
pnpm build       # tsc + vite build (emits to dist/)
pnpm typecheck   # tsc -noEmit
pnpm lint        # biome lint .
pnpm clean       # rm dist / .turbo / coverage / etc.
```

Tests for this package run from the repo root (`pnpm test`). Unit tests stub
`CONVEX_URL` and mock the backend seam — no live deployment required.

## Utility types

The package re-exports a few small helpers used across consumers:

```ts
type Nullable<T> = T | null;
type Optional<T extends Record<string, unknown>> = { [K in keyof T]?: Nullable<T[K]> };
type Identifiable = { handle: string };
type LimitFilters = { limit?: Nullable<number> }
                  | { first?: Nullable<number>; last?: Nullable<number> };
```
