# `@nordcom/commerce-storefront`

The public, multi-tenant storefront. A single Next.js 16 app that serves an arbitrary
number of shops, resolves the tenant from the request hostname, and renders catalog,
cart, account, and CMS pages backed by Shopify and the embedded Payload CMS.

This is the customer-facing surface. The operator dashboard (which also embeds
Payload's admin UI at `/cms`) lives in [`apps/admin`](../admin); the marketing site
is [`apps/landing`](../landing).

## Stack

-   **Framework:** Next.js 16 (App Router, Turbopack), React 19
-   **Commerce:** Shopify Storefront API via `@apollo/client` + `@shopify/hydrogen-react`
-   **CMS:** [`@nordcom/commerce-cms`](../../packages/cms) — Payload-backed pages,
    articles, globals, and a tenant-aware `BlockRenderer`
-   **Auth:** NextAuth v5 (`@auth/core`)
-   **Data:** `@nordcom/commerce-db` for tenant resolution (Mongo / Mongoose)
-   **Styles:** Tailwind CSS 4, SCSS modules, [Nordstar](https://www.npmjs.com/package/@nordcom/nordstar)
-   **Observability:** OpenTelemetry, Vercel Analytics / Speed Insights / Toolbar

## Quick start

From the repo root:

```bash
# Install + build workspace packages first.
pnpm install
pnpm build:packages

# Start the storefront in dev mode.
pnpm dev:storefront
# → http://localhost:1337
```

Required environment variables (see [`.env.example`](../../.env.example) at the root):

| Variable                    | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `MONGODB_URI`               | Tenant resolution. Module-load failure if missing.                        |
| `AUTH_SECRET`               | NextAuth signing secret (also used by the Payload auth bridge).           |
| `SERVICE_DOMAIN`            | Fallback hostname for unknown-shop rewrites.                              |
| `SHOPIFY_WEBHOOK_SECRET`    | HMAC validation for `/api/revalidate`. Required in prod.                  |
| `STOREFRONT_PREVIEW_SECRET` | Required to enter draft mode via `/[domain]/api/cms-preview`.             |

## Multi-tenant routing

`apps/storefront/src/proxy.ts` is the Next.js middleware entry. The flow is:

1.  Dispatch — paths starting with `/admin` go to `admin()` (see `src/middleware/admin.ts`),
    everything else goes to `storefront()` (`src/middleware/storefront.ts`).
2.  `storefront()` reads `req.headers.host`, normalizes it (strips ports, `.localhost`,
    Vercel preview suffixes), then calls `Shop.findByDomain(hostname)` against MongoDB.
3.  On a hit, the resolved domain is injected into the URL so the App Router serves the
    page from `src/app/[domain]/[locale]/…`.
4.  On `NotFoundError`, the middleware rewrites to `SERVICE_DOMAIN/status/unknown-shop/`.
    Other commerce errors → `/status/unknown-error/`.
5.  Unknown hosts in dev/preview fall back to `swedish-candy-store.com` so contributors
    can boot without seeding their own tenant.

> When adding routes, place them under `src/app/[domain]/[locale]/…` — **not** at the
> root. The `[domain]/api/…` segment is reserved for tenant-scoped API endpoints.

## Layout

```text
apps/storefront/
├── src/
│   ├── proxy.ts                # Next.js middleware (entry)
│   ├── middleware/             # Per-area middleware (admin, storefront)
│   ├── app/
│   │   └── [domain]/
│   │       ├── [locale]/       # All public, tenant-scoped pages
│   │       ├── api/            # Tenant-scoped API routes (e.g. /revalidate, /cms-preview)
│   │       └── sitemaps/       # Per-tenant sitemap routes
│   ├── api/                    # Shared data fetchers (AbstractApi, ShopifyApolloApiClient, PageApi dispatcher)
│   ├── auth/                   # NextAuth config
│   ├── cms-loaders.ts          # BlockLoaders for the CMS BlockRenderer (Shopify-aware blocks)
│   ├── components/             # React components (incl. <CMSContent /> dispatcher)
│   ├── hooks/                  # Client hooks
│   ├── instrumentation.ts      # OpenTelemetry
│   ├── locales/                # i18n dictionaries (en, sv, de, es, fr, no)
│   ├── models/                 # UI / data models
│   ├── scss/                   # Global styles
│   └── utils/                  # Locale, abstract-api, ...
├── next.config.js
└── package.json
```

## Data fetching pattern

All Shopify queries go through `AbstractApi` (`src/utils/abstract-api.ts`). Build one
via `ShopifyApolloApiClient({ shop, locale })` (or the public variant). **Never call
Apollo directly from a route.**

```ts
import { ShopifyApolloApiClient } from '@/api/shopify';

const api = await ShopifyApolloApiClient({ shop, locale });
const product = await api.query(/* GraphQL */ PRODUCT_QUERY, { handle });
```

The `@inContext(country, language)` directive is injected automatically by the Apollo
`DocumentTransform` from [`@nordcom/commerce-shopify-graphql`](../../packages/shopify-graphql).
Source operations must **not** pre-declare `@inContext`, `$country`, or `$language` —
the transform owns them and will throw `DuplicateContextDirectiveError` /
`DuplicateContextVariableError` if they're present.

### Cache tags

Cache tags follow `buildCacheTagArray(shop, locale, [...extra])`:

```text
['shopify', 'shopify.<shopId>', '<domain>', '<localeCode>', ...]
```

Per-entity tags use `shopify.<shopId>.product.<handle>` and
`shopify.<shopId>.collection.<handle>` so revalidation can be surgical.

### CMS

CMS access goes through `@nordcom/commerce-cms/api`:

```ts
import { getPage as CmsGetPage } from '@nordcom/commerce-cms/api';

const page = await CmsGetPage({ shop, locale, handle });
```

`src/api/page.ts` is the storefront-level dispatcher that returns either a
`cms`- or `shopify`-provider page; `<CMSContent>` renders block trees via the
`BlockRenderer` from `@nordcom/commerce-cms/blocks/render`, with Shopify-aware
loaders injected from `src/cms-loaders.ts`.

## Cache invalidation / webhooks

`/[domain]/api/revalidate` accepts Shopify webhooks:

-   **Shopify** path verifies `X-Shopify-Hmac-SHA256` via
    `validateShopifyHmac()` (`src/utils/webhooks/shopify.ts`), maps the topic to
    per-entity tags (`parseShopifyWebhook`), and calls `revalidateTag(tag, 'max')`.
    If `SHOPIFY_WEBHOOK_SECRET` is unset, validation is skipped with a warning
    (dev only — never deploy without it).

CMS invalidation runs from the Payload collection `afterChange` hooks in
`@nordcom/commerce-cms`, which call `revalidateTag` directly — no webhook required.

## Locales

`Locale` (`src/utils/locale/locale.ts`) is the canonical locale type — a class with a
`code` like `en-US`. **Never hand-build locale strings.**

```ts
import { Locale } from '@/utils/locale/locale';

Locale.default;                  // → en-US, for shop-less contexts (build, tests, sitemaps)
Locale.fallbackForShop(shop);    // → shop.i18n.defaultLocale — for shop-aware retry/fallback
```

UI strings live in `src/locales/{en,sv,de,es,fr,no}.json` and are loaded via
`getDictionary()`.

## TypeScript aliases

Both `tsconfig.json` and `vitest.config.ts` declare the same aliases — keep them in sync:

| Alias                | Resolves to                              |
| -------------------- | ---------------------------------------- |
| `@/*`                | `src/*`                                  |
| `@/i18n`             | `src/locales`                            |
| `@/i18n/dictionary`  | `src/utils/dictionary.ts`                |
| `@/pages`            | `src/app/[domain]/[locale]`              |

## Scripts

```bash
pnpm dev              # Next.js dev server on :1337 (Turbopack)
pnpm build            # Production build (Turbopack)
pnpm start            # Run the built server ($PORT)
pnpm lint             # biome lint .
pnpm typecheck        # tsc -noEmit
pnpm test:e2e         # Playwright E2E suite
pnpm clean            # Remove .next, dist, .turbo, coverage, logs
```

Unit tests are driven from the repo root: `pnpm test` (Vitest workspace).

## Conventions

-   **Routes:** all public pages under `src/app/[domain]/[locale]/…`.
-   **Provider tokens:** guarded with React's `experimental_taintUniqueValue` — passing
    them to client components throws.
-   **Trailing slashes:** `trailingSlash: true` is set in `next.config.js`. The
    `commonValidations` middleware enforces it for internal links.
-   **`console`:** only `warn` / `error` / `info` / `debug` pass lint. No raw `console.log`.
-   **Sensitive shop fields:** `collaborators` and provider tokens are projected out by
    default. Pass `{ sensitiveData: true }` to opt in, and never in client-reachable code.
