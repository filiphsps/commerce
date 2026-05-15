# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nordcom Commerce is a multi-tenant headless e-commerce platform: a single Next.js 16 deployment that serves arbitrarily many shops, resolved by hostname in middleware. Shopify is the commerce backend; an embedded Payload CMS handles content. Everything is one TypeScript monorepo (pnpm workspaces + Turborepo).

## Principles

### Root Cause Before Symptom

When debugging build errors, OAuth issues, or runtime errors, identify the root cause before applying fixes. Avoid first-guess fixes like reverting versions, returning empty arrays, or disabling features that have valid reasons to exist.

State your hypothesis explicitly before making changes, especially for: Next.js cache/PPR issues, Vite/build tool errors, auth/OIDC problems, and Shopify GraphQL field mismatches.

### Language

All code, comments, commit messages, docs, identifiers, and UI strings use **American English** exclusively — `color`, `behavior`, `organization`, `canceled`, `analyze`. Never `color`, `behavior`, `organization`, `cancelled`, `analyze`.

## Toolchain quirks

-   **Node (`.nvmrc`)**, **pnpm `11.x`** (pinned via `packageManager`), `.nvmrc` is authoritative.
-   **Biome only** for lint + format — there is no ESLint and no Prettier. Don't add config for them; don't add `.prettierrc`.
-   **Vitest 4.x** with project mode — see `vitest.config.ts` for global config, each app/package has its own `vitest.config.ts` consumed as a project.
-   **`pnpm build:packages` is mandatory before lint/typecheck/test in a fresh checkout** — apps import each workspace package from its built `dist/`, not from source. Skipping this breaks `tsc -noEmit` and Vitest type resolution.
-   All top-level scripts go through `dotenv -c -- turbo …`, so `.env` / `.env.local` are loaded automatically — don't prefix env vars manually.

## Commands

```bash
# Dev (each app has a different port)
pnpm dev                 # all apps in parallel
pnpm dev:storefront      # http://localhost:1337
pnpm dev:admin           # http://localhost:3000
pnpm dev:landing         # http://localhost:3001

# Build
pnpm build               # everything (Turbo-cached)
pnpm build:packages      # ./packages/* only — required before quality gates in fresh checkouts
pnpm build:storefront    # filter to storefront

# Quality gates (CI runs the same set)
pnpm lint                # biome lint .
pnpm format              # fixes the auto

# Tests — Vitest needs MONGODB_URI; @nordcom/commerce-db connects at module load
pnpm test                                                            # all projects, with coverage
pnpm test:watch
pnpm dotenv -c -- vitest run path/to/file.test.ts                    # single file
pnpm dotenv -c -- vitest run -t "describe or it name"                # by test name
pnpm dotenv -c -- vitest run --project @nordcom/commerce-storefront  # one project
pnpm test:e2e                                                        # Playwright (storefront, admin)

# Generate Payload types after CMS schema changes
pnpm generate:types
```

Set `MONGODB_URI_TEST` to point tests at a separate database (falls back to `mongodb://localhost:27017/test`).

## Quality Gates

### Pre-commit Verification

-   After making changes, always run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before claiming completion or committing.
-   For monorepo work, run these at the package level first (`pnpm --filter @nordcom/commerce-<name> typecheck`), then at the root if cross-package changes were made.
-   If a pre-commit hook fails due to missing setup (husky, lint-staged, missing `lint:types` script, etc.), report it clearly and offer to fix the config — never bypass with `--no-verify`.

## Architecture

### Multi-tenancy is a middleware-level concern

1.  Entry is `apps/storefront/src/proxy.ts` (Next.js middleware). It dispatches to `admin()` or `storefront()` based on the first path segment.
2.  `storefront()` normalizes `req.headers.host` (strips ports, `.localhost`, Vercel preview suffixes) and calls `Shop.findByDomain(hostname)` against MongoDB.
3.  On hit, the URL is rewritten to `/[domain]/[locale]/…` — the App Router never sees an un-tenanted request.
4.  On `NotFoundError`, redirects to `SERVICE_DOMAIN/status/unknown-shop/`.
5.  Adding a tenant = inserting a row in the `shops` MongoDB collection. No redeploy.

**Tenant context is never implicit.** Every Shopify call goes through `ShopifyApolloApiClient({ shop, locale })`. If you're adding a new data-fetching helper, take `{ shop, locale }` explicitly.

### Locale fallback chain

`request locale → shop default → platform default`, with recursion guards. Locales live on the shop record, not in a global list.

### CMS integration

Payload is mounted inside `apps/admin` under `(payload)`. The storefront consumes the shared config from `@nordcom/commerce-cms` for type-safe block rendering and uses `/[domain]/api/cms-preview` (`STOREFRONT_PREVIEW_SECRET`) to flip Next.js draft mode on.

### Caching and revalidation

Per-tenant, per-entity cache tags. Shopify webhooks call `revalidateTag` via `@tagtree/shopify` (HMAC-verified — needs `SHOPIFY_WEBHOOK_SECRET`); Payload `afterChange`/`afterDelete` hooks call it via `@tagtree/payload`.

## Coding conventions

Lint and formatting rules are defined in `biome.json` — read it for the source of truth. `pnpm format:check` rewrites mismatches (including unsafe fixes like Tailwind class sorting).

-   **`noUncheckedIndexedAccess: true`** — array/object index access is `T | undefined`. Don't paper over with `!` non-null assertions unless you've actually checked.
-   **Trailing slashes** on internal links (`trailingSlash: true` in `next.config.js`).
-   Provider tokens (Shopify keys etc.) are guarded with `experimental_taintUniqueValue` — preserve that pattern.

## Editor hook

`.claude/settings.json` runs `pnpm biome check --write` on every file touched by `Edit`/`Write`. Expect files to be auto-formatted immediately after edits — don't fight it by re-editing for stylistic reasons.

## Things that aren't what they look like

-   `apps/docs/api/` is **TypeDoc-generated** — don't hand-edit.
