<div align="center">

# Nordcom Commerce

**A multi-tenant, headless e-commerce platform as a service.**

[![Unit & Integration Testing](https://github.com/filiphsps/commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/filiphsps/commerce/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/filiphsps/commerce/graph/badge.svg?token=L6I8T166LD)](https://codecov.io/gh/filiphsps/commerce)
[![wakatime](https://wakatime.com/badge/user/c7ebec34-9b91-4b7f-bf49-846cb40584ac/project/804252c9-7824-43c7-8710-f36c1fde0fdf.svg)](https://wakatime.com/badge/user/c7ebec34-9b91-4b7f-bf49-846cb40584ac/project/804252c9-7824-43c7-8710-f36c1fde0fdf)
[![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/filiphsps/commerce?color=%2387F4BC)](https://github.com/filiphsps/commerce/commits/master)
[![TODOs](https://img.shields.io/github/search/filiphsps/commerce/todo?label=todos)](https://github.com/filiphsps/commerce/search?q=todo)
[![FIXMEs](https://img.shields.io/github/search/filiphsps/commerce/fixme?label=fixmes)](https://github.com/filiphsps/commerce/search?q=fixme)

[Website](https://shops.nordcom.io) · [Documentation](https://shops.nordcom.io/docs) · [Issues](https://github.com/filiphsps/commerce/issues) · [Discussions](https://github.com/filiphsps/commerce/discussions)

</div>

---

Nordcom Commerce is a production-grade, multi-tenant storefront platform that serves
many tenants from a single deployment. It pairs **Next.js 16** with **Shopify** as the
commerce backend and **Prismic** as the content layer, and ships an operator dashboard,
a marketing site, and a small set of reusable packages — all in one TypeScript monorepo.

## Highlights

-   **Multi-tenant out of the box.** A single Next.js deployment serves arbitrarily many
    shops; tenants are resolved by hostname in middleware and routed under a
    `/[domain]/[locale]/…` segment, so adding a new shop is a database row, not a deploy.
-   **Headless commerce.** Shopify Storefront API for catalog/cart/checkout, Shopify
    Admin API for back-office operations, all behind a uniform fetch layer.
-   **Composable content.** Prismic slices and structured documents drive marketing
    pages, navigation, and component-level CMS overrides.
-   **i18n that respects shops.** Locales live on the shop record; fallbacks degrade
    from `request → shop default → platform default` with recursion guards.
-   **Edge-friendly caching.** Per-tenant, per-entity cache tags with surgical Shopify
    and Prismic webhook revalidation backed by Redis.
-   **Type-safe end to end.** Strict TypeScript, `noUncheckedIndexedAccess`, and a
    typed error hierarchy used uniformly across packages.
-   **One toolchain.** Turborepo + pnpm workspaces, Biome for lint/format, Vitest for
    tests — no ESLint, no Prettier, no surprises.

## Quick start

> **Prerequisites:** Node.js `22.x` (see `.nvmrc`), `pnpm@11.x`, and a running
> MongoDB instance for the data layer.

```bash
# 1. Install dependencies.
pnpm install

# 2. Configure environment variables. See .env.example for the full list.
cp .env.example .env
# Required at minimum: MONGODB_URI, AUTH_SECRET, SERVICE_DOMAIN.

# 3. Build the workspace packages (apps depend on each package's dist/).
pnpm build:packages

# 4. Start everything in parallel.
pnpm dev
```

You should now have:

| App          | URL                       |
| ------------ | ------------------------- |
| Storefront   | <http://localhost:1337>   |
| Admin        | <http://localhost:3000>   |
| Landing      | <http://localhost:3001>   |

To start only one app, use `pnpm dev:storefront`, `pnpm dev:admin`, or `pnpm dev:landing`.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                       Browser / Customer                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Host header
                  ┌────────────▼────────────┐
                  │  Next.js middleware     │
                  │  (apps/storefront)      │
                  │  Resolves tenant by     │
                  │  hostname → MongoDB     │
                  └────────────┬────────────┘
                               │
        ┌──────────────────────┼───────────────────────┐
        ▼                      ▼                       ▼
┌───────────────┐     ┌───────────────┐       ┌────────────────┐
│  Storefront   │     │     Admin     │       │    Landing     │
│  (tenant UI)  │     │  (operator)   │       │  (marketing)   │
└───────┬───────┘     └───────┬───────┘       └────────┬───────┘
        │                     │                        │
        │   workspace:* packages — db, errors,         │
        │   shopify-graphql, shopify-html,             │
        │   marketing-common                           │
        ▼                     ▼                        ▼
┌─────────────────┐  ┌──────────────────┐    ┌──────────────────┐
│ Shopify Store-  │  │ Shopify Admin    │    │   Prismic CMS    │
│   front API     │  │      API         │    │  (slices, docs)  │
└─────────────────┘  └──────────────────┘    └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │     MongoDB      │
                     │  (shops, users)  │
                     └──────────────────┘
```

For a deeper tour of the routing, data-access, and webhook flows, see [`CLAUDE.md`](./CLAUDE.md).

## Repository layout

```text
commerce/
├── apps/
│   ├── storefront/   # Public tenant storefront (Next.js, Prismic, Shopify Storefront API)
│   ├── admin/        # Merchant dashboard      (Next.js, NextAuth, Shopify Admin API)
│   └── landing/      # Marketing site          (Next.js, Markdoc)
├── packages/
│   ├── db/                  # Mongoose models + services (server-only)
│   ├── errors/              # Typed, code-tagged error hierarchy
│   ├── shopify-graphql/     # Apollo DocumentTransform for Shopify @inContext
│   ├── shopify-html/        # Shopify rich-text → React / plain text
│   └── marketing-common/    # Shared marketing UI primitives
├── docs/                # Internal architecture notes
├── scripts/             # Local CI runner, helpers
├── biome.json           # Lint/format config (no ESLint / Prettier)
├── turbo.json           # Turborepo pipeline
├── vitest.config.ts     # Vitest workspace root
└── pnpm-workspace.yaml  # pnpm workspaces
```

### Apps

| Package                          | Path              | Description                                              |
| -------------------------------- | ----------------- | -------------------------------------------------------- |
| `@nordcom/commerce-storefront`   | `apps/storefront` | Public, multi-tenant storefront for end customers.       |
| `@nordcom/commerce-admin`        | `apps/admin`      | Operator dashboard for managing shops and integrations.  |
| `@nordcom/commerce-landing`      | `apps/landing`    | Marketing & documentation site.                          |

### Packages

| Package                              | Path                       | Description                                                              |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------ |
| `@nordcom/commerce-db`               | `packages/db`              | Mongoose models + service layer for shops, users, sessions, identities.  |
| `@nordcom/commerce-errors`           | `packages/errors`          | Typed error classes with stable codes for API/UI/SDK consumers.          |
| `@nordcom/commerce-shopify-graphql` | `packages/shopify-graphql` | Apollo transform that injects Shopify `@inContext(country, language)`.   |
| `@nordcom/commerce-shopify-html`     | `packages/shopify-html`    | Convert Shopify rich text HTML to React trees or plain text.             |
| `@nordcom/commerce-marketing-common` | `packages/marketing-common`| Shared Nordstar theme and primitives for marketing surfaces.             |

## Toolchain

| Concern         | Tool                                                              |
| --------------- | ----------------------------------------------------------------- |
| Package manager | [pnpm](https://pnpm.io) 11.x (workspaces)                         |
| Runtime         | Node.js 22.x (see `.nvmrc`)                                       |
| Build / cache   | [Turborepo](https://turbo.build) 2.x (with optional Remote Cache) |
| Framework       | [Next.js](https://nextjs.org) 16, React 19                        |
| Lint / format   | [Biome](https://biomejs.dev) 2.x — **no ESLint / Prettier**       |
| Testing         | [Vitest](https://vitest.dev) 4.x + Playwright for E2E             |
| Bundling (libs) | [Vite](https://vitejs.dev) (per-package `dist/`)                  |
| Data            | MongoDB (Mongoose 9.x)                                            |
| Cache           | Redis via `@neshca/cache-handler` (production only)               |
| Auth            | NextAuth v5 (`@auth/core`)                                        |
| Observability   | Sentry, OpenTelemetry, Vercel Analytics                           |

## Commands

All scripts go through `dotenv -c -- turbo …`, so `.env` / `.env.local` are loaded
automatically. Run from the repo root unless noted.

### Development

```bash
pnpm dev                # All apps in parallel
pnpm dev:storefront     # Only the storefront     (http://localhost:1337)
pnpm dev:admin          # Only the admin          (http://localhost:3000)
pnpm dev:landing        # Only the marketing site (http://localhost:3001)
pnpm slicemachine       # Open Prismic Slicemachine (storefront only)
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

> Tests need `MONGODB_URI` pointing at a real database — `@nordcom/commerce-db`
> connects at module load.

### Housekeeping

```bash
pnpm clean              # rm dist / .next / .turbo / coverage everywhere
```

## Environment

Copy `.env.example` to `.env` and fill in the values you need. The minimum set for
local development is:

| Variable                | Required | Purpose                                                  |
| ----------------------- | -------- | -------------------------------------------------------- |
| `MONGODB_URI`           | Yes      | Mongo connection string. `@nordcom/commerce-db` needs this at import time. |
| `AUTH_SECRET`           | Yes      | NextAuth signing secret.                                 |
| `AUTH_TRUST_HOST`       | Yes      | Set to `true` for local development behind proxies.      |
| `SERVICE_DOMAIN`        | Yes      | Root hostname used for unknown-shop rewrites and links.  |
| `SHOPIFY_API_KEY`       | Optional | Required for Shopify Admin API integrations.             |
| `SHOPIFY_API_SECRET_KEY`| Optional | Pairs with `SHOPIFY_API_KEY`.                            |
| `SHOPIFY_WEBHOOK_SECRET`| Prod     | HMAC for Shopify webhooks. Skipped (with warning) in dev.|
| `DATA_CACHE_REDIS_URL`  | Prod     | Enables the Redis-backed Next.js data cache.             |
| `SENTRY_AUTH_TOKEN`     | Optional | Source-map uploads at build time.                        |
| `TURBO_TOKEN` / `TURBO_TEAM` | Optional | Turborepo Remote Cache.                              |

See [`.env.example`](./.env.example) for the full, commented list.

## Multi-tenancy in 30 seconds

1.  A request arrives at the Next.js middleware (`apps/storefront/src/proxy.ts`).
2.  The middleware normalizes the `host` header (stripping ports, `.localhost`, and
    Vercel preview suffixes) and calls `Shop.findByDomain(hostname)` against MongoDB.
3.  On a hit, it rewrites the URL into the `/[domain]/[locale]/…` segment so the App
    Router serves the page in the tenant's context.
4.  On `NotFoundError`, the middleware rewrites to `SERVICE_DOMAIN/status/unknown-shop/`.
5.  Every Shopify call is built through `ShopifyApolloApiClient({ shop, locale })`, so
    tenant context is never implicit.

To add a tenant, insert a row into the `shops` collection — no redeploy required.

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

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs **lint**, **typecheck**, **test**, and
**build** in parallel on every PR and on pushes to `master`, `staging`, and
`dev/*` / `fix/*` branches. Coverage is uploaded to Codecov.

The `test` job requires a real `MONGODB_URI` — there is no in-memory mock.

## Maintainers

-   2019–2026 — Filiph Siitam Sandström, [@filiphsps](https://github.com/filiphsps)
-   2023–2024 — Nordcom Group Inc., [@NordcomInc](https://github.com/NordcomInc)
-   2024     — Nordcom AB, [@NordcomInc](https://github.com/NordcomInc)

## License

This repository is private. Copyright notices:

-   © 2019–2026 Filiph Siitam Sandström.
-   © 2023 Nordcom Group Inc.
-   © 2024 Nordcom AB.
