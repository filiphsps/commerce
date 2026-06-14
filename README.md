<div align="center">

# Nordcom Commerce

**A multi-tenant, headless e-commerce platform as a service.**

[![Unit & Integration Testing](https://github.com/filiphsps/commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/filiphsps/commerce/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/filiphsps/commerce/graph/badge.svg?token=L6I8T166LD)](https://codecov.io/gh/filiphsps/commerce)
[![wakatime](https://wakatime.com/badge/user/c7ebec34-9b91-4b7f-bf49-846cb40584ac/project/804252c9-7824-43c7-8710-f36c1fde0fdf.svg)](https://wakatime.com/badge/user/c7ebec34-9b91-4b7f-bf49-846cb40584ac/project/804252c9-7824-43c7-8710-f36c1fde0fdf)
[![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/filiphsps/commerce?color=%2387F4BC)](https://github.com/filiphsps/commerce/commits/master)
[![TODOs](https://img.shields.io/github/search/filiphsps/commerce/todo?label=todos)](https://github.com/filiphsps/commerce/search?q=todo)
[![FIXMEs](https://img.shields.io/github/search/filiphsps/commerce/fixme?label=fixmes)](https://github.com/filiphsps/commerce/search?q=fixme)

[Issues](https://github.com/filiphsps/commerce/issues) · [Discussions](https://github.com/filiphsps/commerce/discussions)

</div>

---

Nordcom Commerce is a production-grade, multi-tenant storefront platform that serves
many tenants from a single deployment. It pairs **Next.js 16** with **Shopify** as the
commerce backend and a **Convex**-backed data + content layer, and ships an operator
dashboard, a marketing site, and a small set of reusable packages — all in one
TypeScript monorepo.

## Highlights

-   **Multi-tenant out of the box.** A single Next.js deployment serves arbitrarily many
    shops; tenants are resolved by hostname in middleware and routed under a
    `/[domain]/[locale]/…` segment, so adding a new shop is a database row, not a deploy.
-   **Headless commerce.** Shopify Storefront API for catalog/cart/checkout, Shopify
    Admin API for back-office operations, all behind a uniform fetch layer.
-   **Composable content.** Descriptor-defined CMS blocks and structured documents
    drive marketing pages, navigation, and component-level CMS overrides — authored in
    the admin app's editor, stored in Convex, and rendered by the storefront via
    `@nordcom/commerce-cms`.
-   **i18n that respects shops.** Locales live on the shop record; fallbacks degrade
    from `request → shop default → platform default` with recursion guards.
-   **Edge-friendly caching.** Per-tenant, per-entity cache tags with surgical Shopify
    webhook revalidation and CMS-driven `revalidateTag` hooks.
-   **Type-safe end to end.** Strict TypeScript, `noUncheckedIndexedAccess`, and a
    typed error hierarchy used uniformly across packages.
-   **One toolchain.** Turborepo + pnpm workspaces, Biome for lint/format, Vitest for
    tests — no ESLint, no Prettier, no surprises.

## Quick start

> **Prerequisites:** Node.js (see `.nvmrc`) and `pnpm`. The data layer is
> [Convex](https://convex.dev) — local development runs against a **local** backend
> (no database server, no cloud account), booted and seeded automatically.

```bash
# 1. Install dependencies.
pnpm install

# 2. Configure environment variables. See .env.example for the full list. The Convex
#    vars default to the local backend on :3210, so the defaults work out of the box.
cp .env.example .env
# Required at minimum: AUTH_SECRET, SERVICE_DOMAIN.

# 3. Build the workspace packages (apps depend on each package's dist/).
pnpm build:packages

# 4. Start everything. `pnpm dev` first runs `pnpm convex:local`, which boots a
#    persistent local Convex backend on :3210, pushes the functions, and applies the
#    advanced canonical seed — then launches the apps against it.
pnpm dev
```

> **Local Convex backend.** `pnpm dev` is local-first: it depends on `pnpm convex:local`
> (a persistent anonymous backend in `.convex-local/`, seeded with an advanced demo shop
> `nordcom-demo-shop.com` plus a minimal `minimal-demo.com`). Manage it with
> `pnpm convex:local` (boot + seed, idempotent), `pnpm convex:local:reset` (wipe + reseed),
> and `pnpm convex:local:stop`. To use a cloud deployment instead, point `CONVEX_URL` /
> `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SERVER_SECRET` at it. CI runs its integration and e2e
> suites against the same seeded local backend — no production Convex in CI.

You should now have:

| App          | URL                                     |
| ------------ | --------------------------------------- |
| Storefront   | <https://storefront.localhost>          |
| Admin        | <https://admin.localhost>               |
| Landing      | <https://landing.localhost>             |

> **One-time setup:** install [portless](https://github.com/vercel-labs/portless) globally
> (`npm install -g portless`), then run `portless trust` (adds the local CA to the system
> trust store — requires a sudo prompt). `pnpm dev` will start the proxy automatically.

To start only one app, use `pnpm dev:storefront`, `pnpm dev:admin`, or `pnpm dev:landing`.

## Repository layout

### Apps

| Package                          | Path              | Description                                              |
| -------------------------------- | ----------------- | -------------------------------------------------------- |
| `@nordcom/commerce-storefront`   | `apps/storefront` | Public, multi-tenant storefront for end customers.       |
| `@nordcom/commerce-admin`        | `apps/admin`      | Operator dashboard for managing shops and integrations.  |
| `@nordcom/commerce-landing`      | `apps/landing`    | Marketing & documentation site.                          |

### Packages

| Package                              | Path                       | Description                                                              |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------ |
| `@nordcom/commerce-db`               | `packages/db`              | Typed service layer over Convex for shops, users, sessions, identities.  |
| `@nordcom/commerce-convex`           | `packages/convex`          | The Convex deployment: schema, tables, and the `db/*` + `cms/*` functions. |
| `@nordcom/commerce-test-convex`      | `packages/test-convex`     | Local Convex backend launcher + canonical seed fixtures for tests/e2e.   |
| `@nordcom/commerce-errors`           | `packages/errors`          | Typed error classes with stable codes for API/UI/SDK consumers.          |
| `@nordcom/commerce-shopify-graphql` | `packages/shopify-graphql` | Apollo transform that injects Shopify `@inContext(country, language)`.   |
| `@nordcom/commerce-shopify-html`     | `packages/shopify-html`    | Convert Shopify rich text HTML to React trees or plain text.             |
| `@nordcom/commerce-marketing-common` | `packages/marketing-common`| Shared Nordstar theme and primitives for marketing surfaces.             |

## Toolchain

| Concern         | Tool                                                              |
| --------------- | ----------------------------------------------------------------- |
| Package manager | [pnpm](https://pnpm.io) 11.x (workspaces)                         |
| Runtime         | Node.js (see `.nvmrc`)                                       |
| Build / cache   | [Turborepo](https://turbo.build) 2.x (with optional Remote Cache) |
| Framework       | [Next.js](https://nextjs.org) 16, React 19                        |
| Lint / format   | [Biome](https://biomejs.dev) 2.x — **no ESLint / Prettier**       |
| Testing         | [Vitest](https://vitest.dev) 4.x + Playwright for E2E             |
| Bundling (libs) | [Vite](https://vitejs.dev) (per-package `dist/`)                  |
| Data            | [Convex](https://convex.dev) (schema + functions in `packages/convex`) |
| Auth            | NextAuth v5 (`@auth/core`)                                        |                      |

## Commands

All scripts go through `dotenv -c -- turbo …`, so `.env` / `.env.local` are loaded
automatically. Run from the repo root unless noted.

### Development

```bash
pnpm dev                # All apps in parallel
pnpm dev:storefront     # Only the storefront     (https://storefront.localhost)
pnpm dev:admin          # Only the admin          (https://admin.localhost)
pnpm dev:landing        # Only the marketing site (https://landing.localhost)
```

### Build

```bash
pnpm build              # Build everything (Turbo-cached)
pnpm build:packages     # Only ./packages/* — required before lint/typecheck/test
pnpm build:admin        # Filter to the admin app
```

### Quality gates

```bash
pnpm lint               # biome lint .
pnpm typecheck          # turbo run typecheck (each app does `tsc -noEmit`)
pnpm format:check       # biome check --write --unsafe . (auto-fixes!)
pnpm format             # biome lint --write + biome format --write
```

### Tests

```bash
pnpm test                                                       # Vitest, all projects, with coverage
pnpm test:watch                                                 # Watch mode
pnpm dotenv -c -- vitest run path/to/file.test.ts               # Single file
pnpm dotenv -c -- vitest run -t "describe or it name"           # By name
pnpm dotenv -c -- vitest run --project @nordcom/commerce-storefront   # One project
pnpm test:e2e                                                   # Playwright (admin, storefront)
```

> Unit tests run against `convex-test` in-memory — no backend required. Integration
> and e2e suites boot an ephemeral local Convex backend via
> `@nordcom/commerce-test-convex`, or attach to the deployment in `CONVEX_URL`.

### Housekeeping

```bash
pnpm clean              # rm dist / .next / .turbo / coverage everywhere
```

## Environment

Copy `.env.example` to `.env` and fill in the values you need. See [`.env.example`](./.env.example) for the full, commented list.

## Multi-tenancy in 30 seconds

1.  A request arrives at the Next.js middleware (`apps/storefront/src/proxy.ts`).
2.  The middleware normalizes the `host` header (stripping ports, `.localhost`, and
    Vercel preview suffixes) and calls `Shop.findByDomain(hostname)`, which resolves
    the tenant through the Convex `db/shops` query seam.
3.  On a hit, it rewrites the URL into the `/[domain]/[locale]/…` segment so the App
    Router serves the page in the tenant's context.
4.  On `NotFoundError`, the middleware rewrites to `SERVICE_DOMAIN/status/unknown-shop/`.
5.  Every Shopify call is built through `ShopifyApolloApiClient({ shop, locale })`, so
    tenant context is never implicit.

To add a tenant, write a `shops` row through the admin (the `db/shop_write:upsertShop`
mutation) — no redeploy required.

## Contributing

Pull requests are welcome. Before opening one:

1.  Make sure `pnpm install` succeeds with the pinned `packageManager` (pnpm 11.x).
2.  Run `pnpm build:packages` before linting, typechecking, or testing in a fresh
    checkout — apps depend on each package's `dist/`.
3.  Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` locally; CI runs the same.
4.  Follow the Biome formatting (4-space indent, single quotes, semicolons,
    trailing commas, `lineWidth: 120`). `pnpm format:check` will rewrite mismatches.
5.  Use `import type` for type-only imports — `useImportType` is enforced as an error.
6.  Plain `console.log` will fail lint; only `warn` / `error` / `info` / `debug` are
    permitted outside of test/config files.

## Maintainers

-   2019–2026 — Filiph Sandström, [@filiphsps](https://github.com/filiphsps)
-   2023–2024 — Nordcom Group Inc., [@NordcomInc](https://github.com/NordcomInc)
-   2024     — Nordcom AB, [@NordcomInc](https://github.com/NordcomInc)

## License

This repository is private. Copyright notices:

-   © 2019–2026 Filiph Sandström.
-   © 2023 Nordcom Group Inc.
-   © 2024 Nordcom AB.
