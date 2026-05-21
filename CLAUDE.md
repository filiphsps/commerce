# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

Nordcom Commerce — a multi-tenant headless e-commerce platform. One Next.js 16 deployment serves arbitrarily many shops, resolved by hostname in middleware. Shopify is the commerce backend; embedded Payload CMS handles content. pnpm workspaces + Turborepo monorepo, TypeScript throughout.

## Principles

-   **Root cause before symptom.** State your hypothesis before changing code. Don't revert versions, return empty arrays, or disable features as a first-guess fix — especially for Next.js cache/PPR, build-tool errors, OIDC, or Shopify GraphQL field mismatches.
-   **American English** everywhere — code, comments, commits, docs, UI. `color`, `behavior`, `organization`, `canceled`, `analyze`. Never the `-our`/`-ise`/`-lled` spellings.
-   **Docs stay in sync.** If a change affects documented behavior, config, commands, architecture, or conventions, update the docs in the same change. Doc drift is a defect.

## Toolchain quirks

-   Node from `.nvmrc` (authoritative). pnpm `11.x` pinned via `packageManager`.
-   **Biome only** for lint + format. No ESLint, no Prettier — don't add config for them.
-   **Vitest 4.x** project mode (root `vitest.config.ts` + per-package configs).
-   **`pnpm build:packages` is mandatory before lint/typecheck/test in a fresh checkout** — apps import workspace packages from built `dist/`, not source.
-   All top-level scripts run through `dotenv -c -- turbo …`; `.env` / `.env.local` load automatically. Don't prefix env vars manually.
-   **`pnpm cms:gen`** regenerates `apps/admin/src/lib/cms-actions/_generated/`. Run after touching `packages/cms/src/editor/manifests/*`. CI checks via `pnpm cms:gen:check`.
-   **Storefront GraphQL is `gql.tada`.** Author queries with `graphql()` from `@nordcom/commerce-shopify-graphql/graphql`, not Apollo's `gql` — `api.query(MY_QUERY, vars)` infers `data` and `variables` from `storefront.schema.json`. Regenerate with `pnpm --filter @nordcom/commerce-shopify-graphql generate` (also wired into `pnpm generate`) when bumping `@shopify/hydrogen-react`. Schema and `graphql-env.d.ts` are committed.
-   **Always call `init` from `next-devtools-mcp` first** when starting Next.js work — sets up context and doc requirements. Don't wait to be asked.

## Commands

```bash
# Dev — stable HTTPS URLs via portless (vercel-labs/portless).
# One-time:  npm i -g portless && portless trust  (sudo for CA)
#            portless service install  (optional auto-start)
# `pnpm dev` runs `predev` first which boots the wildcard proxy if absent.

pnpm dev              # portless proxy (storefront only by default)
pnpm dev:all          # all apps in parallel via turbo
pnpm dev:storefront   # https://storefront.localhost · https://<shop>.storefront.localhost
pnpm dev:admin        # https://admin.localhost
pnpm dev:landing      # https://landing.localhost
pnpm dev:docs         # https://docs.localhost

# Build
pnpm build            # everything (Turbo-cached)
pnpm build:packages   # ./packages/* only — required in fresh checkouts
pnpm build:storefront # filter to one app

# Quality gates (CI runs the same set)
pnpm typecheck        # turbo run typecheck
pnpm lint             # biome lint .
pnpm format:check     # biome check --write --unsafe . (includes Tailwind sort)

# Tests — Vitest needs MONGODB_URI; @nordcom/commerce-db connects at module load.
# Set MONGODB_URI_TEST for a separate DB (defaults to mongodb://localhost:27017/test).
pnpm test                                                            # all projects + coverage
pnpm test:watch
pnpm dotenv -c -- vitest run path/to/file.test.ts                    # single file
pnpm dotenv -c -- vitest run -t "test name"                          # by name
pnpm dotenv -c -- vitest run --project @nordcom/commerce-storefront  # one project
pnpm test:e2e                                                        # Playwright (storefront, admin)

pnpm generate         # regenerate CMS + GraphQL types
```

## Pre-commit verification

Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before claiming done. For monorepo changes start at the package level (`pnpm --filter @nordcom/commerce-<name> typecheck`), then root if cross-package. **Never bypass hooks with `--no-verify`** — fix the underlying issue, or report missing setup so it can be patched.

## Architecture

### Multi-tenancy is a middleware concern

1.  Entry: `apps/storefront/src/proxy.ts` dispatches to `admin()` or `storefront()` by first path segment.
2.  `storefront()` normalizes `req.headers.host` (strips ports, `.localhost`, Vercel preview suffixes) and calls `Shop.findByDomain(hostname)`.
3.  Hit → URL rewritten to `/[domain]/[locale]/…`. The App Router never sees an un-tenanted request.
4.  `NotFoundError` → redirects to `SERVICE_DOMAIN/status/unknown-shop/`.
5.  Adding a tenant = inserting a row in the `shops` MongoDB collection. No redeploy.

**Tenant context is never implicit.** Every Shopify call goes through `ShopifyApolloApiClient({ shop, locale })`. New data-fetching helpers must take `{ shop, locale }` explicitly.

### Locale fallback

`request locale → shop default → platform default`, with recursion guards. Locales live on the shop record, not in a global list.

### CMS integration

Payload mounts inside `apps/admin` under `(payload)`. The storefront consumes the shared config from `@nordcom/commerce-cms` for type-safe block rendering and flips draft mode via `/[domain]/api/cms-preview` (`STOREFRONT_PREVIEW_SECRET`).

### Caching and revalidation

Per-tenant, per-entity cache tags. Shopify webhooks call `revalidateTag` via `@tagtree/shopify` (HMAC-verified — needs `SHOPIFY_WEBHOOK_SECRET`); Payload `afterChange`/`afterDelete` hooks call it via `@tagtree/payload`.

### Admin shell

`apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx` is a CSS grid (`grid-template-rows: 56px 1fr`) wrapping a horizontal `react-resizable-panels` v4 `<Group>` with `<Separator>` dividers. Up to four panes: icon rail, sub-nav, content, inspector.

-   **Sub-nav**: `[domain]/@subnav/<section>/default.tsx`. Returns null elsewhere; shell collapses the pane when empty.
-   **Inspector**: `[domain]/@inspector/<route>/default.tsx`. Same pattern.
-   Pages render their own `<PageHeader title=… breadcrumbs=… actions=… />` and optional `<PageFooter>`. Shell-owned `<ContentScrollRegion>` handles sticky behavior — pages don't manage scroll math.

To add a section with sub-nav: create `[domain]/<section>/layout.tsx` if needed, then `[domain]/@subnav/<section>/default.tsx` listing the `<NavItem>`s. To opt into an inspector: `[domain]/@inspector/<path>/default.tsx`.

## Coding conventions

`biome.json` is the source of truth. `pnpm format:check` rewrites (including unsafe fixes like Tailwind sorting).

-   **`noUncheckedIndexedAccess: true`** — index access is `T | undefined`. Don't paper over with `!`; check it.
-   **Trailing slashes** on internal links (`trailingSlash: true`).
-   Provider tokens (Shopify keys, etc.) are guarded with `experimental_taintUniqueValue` — preserve that.
-   **Use `@nordcom/commerce-errors` for every thrown error.** Never `throw new Error(...)`. If no class fits, add one (plus `*ErrorKind` and a `getErrorFromCode` case) in `packages/errors/src/index.ts`. Errors carry `statusCode`, `code`, and `help` URLs the platform relies on.

## Editor hook

`.claude/settings.json` runs `pnpm biome check --write` on every `Edit`/`Write` via `PostToolUse`. Files auto-format right after edits — don't re-edit for stylistic reasons.
