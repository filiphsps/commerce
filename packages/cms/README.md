# `@nordcom/commerce-cms`

Multi-tenant CMS built on Payload 3.x. Embedded into `apps/admin` as the editor UI
(`/cms`) and consumed by `apps/storefront` for the read side through Payload's Local
API and a typed `<BlockRenderer />`.

> **Server-only.** The query API (`@nordcom/commerce-cms/api`) and the cache module
> (`@nordcom/commerce-cms/cache`) are marked `'server-only'` and call into
> Payload's Local API directly. Don't import them from client components.

## Why

A single deployment serves many tenants, and each tenant needs its own pages,
articles, navigation, business data, and per-product/collection metadata. This
package exists so the platform has exactly one canonical Payload config:

-   **One schema, many tenants.** All content collections carry a `tenant` relation
    and are filtered by `@payloadcms/plugin-multi-tenant`. Access predicates make
    the tenant boundary a hard wall — admins see everything, editors see only their
    shops, public reads see only published docs.
-   **Shopify-aware blocks, no Shopify dependency in the CMS.** The block model is
    defined here; data loaders for `collection` / `vendors` / `overview` blocks are
    injected by the storefront, so this package stays free of Shopify imports.
-   **One Payload instance.** `getPayloadInstance()` returns a memoized `Payload`
    that the storefront's read paths reuse — no separate DB connection per route.
-   **Cache invalidation by construction.** Every content collection's
    `afterChange` / `afterDelete` hooks fan out `revalidateTag` calls on the
    [`@tagtree/payload`](../tagtree-payload) adapter, so a single mutation flushes
    exactly the per-tenant, per-collection, per-handle tags the storefront read.

## Install

This package is a workspace package — consume it via `workspace:*`:

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-cms": "workspace:*"
    },
    "peerDependencies": {
        "@payloadcms/db-mongodb": "^3.84.0",
        "@payloadcms/next": "^3.84.0",
        "@payloadcms/plugin-multi-tenant": "^3.84.0",
        "@payloadcms/richtext-lexical": "^3.84.0",
        "@payloadcms/storage-s3": "^3.84.0",
        "next": "^16.2.6",
        "payload": "^3.84.0",
        "react": "^19.2.0",
        "react-dom": "^19.2.0"
    }
}
```

It is built with Vite to `dist/` and consumed by both apps and other packages. Run
`pnpm build:packages` from the repo root in a fresh checkout — apps depend on the
emitted `dist/`, not the source.

## Usage

### Embedding the CMS in an app

```ts
// apps/myapp/src/payload.config.ts
import { buildPayloadConfig } from '@nordcom/commerce-cms/config';

export default buildPayloadConfig({
    secret: process.env.PAYLOAD_SECRET!,
    mongoUrl: process.env.MONGODB_URI!,
    includeAdmin: true,        // mount editor at /cms — storefront passes false
    enableStorage: true,       // reads S3_* env vars if all five are set
});
```

Wrap your Next.js config:

```js
// next.config.js
import { withPayload } from '@payloadcms/next/withPayload';
export default withPayload(config);
```

…and mount the routes by re-exporting from `@payloadcms/next/views`:

```ts
// src/app/(payload)/cms/[[...segments]]/page.tsx
export { RootPage as default } from '@payloadcms/next/views';
```

`apps/admin` is the reference implementation — copy that wiring.

### Reading content from the storefront

```ts
import { getPage, getHeader, resolveLink } from '@nordcom/commerce-cms/api';

const page = await getPage({ shop, locale, slug: 'about' });
const header = await getHeader({ shop, locale });
const href = resolveLink(link, { locale });
```

Every read goes through the cached `getPayloadInstance()` so the storefront never
opens its own Mongo connection. The first call boots Payload; subsequent calls
share the same instance.

### Rendering blocks

```tsx
import { BlockRenderer } from '@nordcom/commerce-cms/blocks/render';

<BlockRenderer
    blocks={page.blocks}
    context={{
        shop,
        locale,
        loaders: {
            loadCollection,   // → ShopifyCollectionSummary | null
            loadVendors,      // → ShopifyVendorSummary[]
            loadOverview,     // → ShopifyProductSummary[]
        },
    }}
/>;
```

`BlockRenderer` dispatches on `block.blockType` and recurses through nested
`columns` blocks up to `MAX_DEPTH = 6`. Loaders are passed in so this package
stays Shopify-agnostic — see the storefront for the concrete implementations.

## Public API

The package ships several entry points; each maps to a folder under `src/`.

| Subpath          | Source                  | Purpose                                                                 |
| ---------------- | ----------------------- | ----------------------------------------------------------------------- |
| `./config`       | `src/config/`           | `buildPayloadConfig` + locale helpers.                                  |
| `./collections`  | `src/collections/`      | Payload collections (`pages`, `articles`, …) + `allCollections` array.  |
| `./blocks`       | `src/blocks/`           | Block definitions (`alertBlock`, `bannerBlock`, …) + `allBlocks`.       |
| `./blocks/render`| `src/blocks/render/`    | `BlockRenderer` + block node types and the `BlockLoaders` contract.     |
| `./fields`       | `src/fields/`           | Reusable Payload field groups (`imageField`, `linkField`, `seoGroup`).  |
| `./access`       | `src/access/`           | Access predicates: `tenantScopedRead`/`Write`, `adminOnly`, `publicRead`. |
| `./api`          | `src/api/`              | `getPage` / `getArticle` / `getHeader` / … + `getPayloadInstance`.      |
| `./cache`        | `src/cache.ts`          | `cmsCache` (tagtree) + `cmsTenantRootTags()`.                           |
| `./plugins`      | `src/plugins/`          | `buildMultiTenantPlugin`, `storagePluginFromEnv`.                       |
| `./shop-sync`    | `src/shop-sync/`        | `attachShopSync(Shop.model, payload)` — mirrors `Shop` rows into tenants. |
| `./types`        | `src/types/`            | Re-exports the Payload-generated `payload-types.ts`.                    |
| `./test-utils`   | `src/test-utils/`       | `bootTestPayload`, `buildTestConfig`, `seedTenant`.                     |
| `./auth`         | `src/auth/`             | Legacy NextAuth → Payload bridge entry point. Empty today.              |

### Collections

| Collection         | File                                | Notes                                                                 |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------- |
| `tenants`          | `src/collections/tenants.ts`        | Internal — synced from `Shop` via `attachShopSync`.                   |
| `users`            | `src/collections/users.ts`          | Editor accounts, with the auth strategies plugged in via `buildUsers`. |
| `media`            | `src/collections/media.ts`          | Image uploads; backed by S3 when the `S3_*` env block is set.         |
| `pages`            | `src/collections/pages.ts`          | Slug + blocks. Drafts + autosave at 2s.                               |
| `articles`         | `src/collections/articles.ts`       | Slug + body. Drafts.                                                  |
| `productMetadata`  | `src/collections/product-metadata.ts` | Per-`shopifyHandle` SEO/marketing overrides.                        |
| `collectionMetadata` | `src/collections/collection-metadata.ts` | Per-`shopifyHandle` overrides for Shopify collections.            |
| `header`           | `src/collections/_globals/header.ts` | `isGlobal` — one row per tenant.                                     |
| `footer`           | `src/collections/_globals/footer.ts` | `isGlobal` — one row per tenant.                                     |
| `businessData`     | `src/collections/_globals/business-data.ts` | `isGlobal` — addresses, phone, support email, etc.            |

Three collections (`header`, `footer`, `businessData`) are modelled as
singleton-like rows under `@payloadcms/plugin-multi-tenant`'s `isGlobal: true`
flag; the plugin treats them as one row per tenant from the UI but they live in
the normal collection store.

### Blocks

Nine block types, all defined under `src/blocks/`:

| Block        | File                          | Loader required? |
| ------------ | ----------------------------- | ---------------- |
| `alert`      | `src/blocks/alert.ts`         | no               |
| `banner`     | `src/blocks/banner.ts`        | no               |
| `html`       | `src/blocks/html.ts`          | no               |
| `media-grid` | `src/blocks/media-grid.ts`    | no               |
| `rich-text`  | `src/blocks/rich-text.ts`     | no               |
| `columns`    | `src/blocks/columns.ts`       | no (recurses)    |
| `collection` | `src/blocks/collection.ts`    | `loadCollection` |
| `vendors`    | `src/blocks/vendors.ts`       | `loadVendors`    |
| `overview`   | `src/blocks/overview.ts`      | `loadOverview`   |

Block node types live in `src/blocks/render/types.ts` and form a discriminated
union on `blockType`. `BlockRenderer` switches on it.

### Access predicates

Drop these into a `CollectionConfig['access']` block:

```ts
import {
    tenantScopedRead,
    tenantScopedWrite,
    adminOnly,
    publicRead,
    publishedOrAuthRead,
    isTenantMember,
    isAdmin,
} from '@nordcom/commerce-cms/access';
```

-   `tenantScopedRead` — public sees `_status: 'published'` only; admins see
    everything; editors see docs for their tenants.
-   `tenantScopedWrite` — any logged-in user with at least one tenant assignment.
-   `adminOnly` — gate for destructive operations (`delete`).
-   `publicRead` — always-true read for non-sensitive collections.
-   `publishedOrAuthRead` — anonymous reads see `_status: 'published'`; CMS users
    see drafts too. Use this on draft-enabled global-like collections.

### Query API

Every reader takes `{ shop, locale, draft? }` and returns the first matching doc
(or `null`). They run through `getPayloadInstance()` by default; pass `__payload`
in tests to swap in an isolated instance.

```ts
import {
    getPage,
    getArticle,
    getArticles,
    getHeader,
    getFooter,
    getBusinessData,
    getProductMetadata,
    getCollectionMetadata,
    resolveLink,
    getPayloadInstance,
} from '@nordcom/commerce-cms/api';
```

The reads apply `shop.i18n.defaultLocale` as the Payload `fallbackLocale`, so a
locale-less doc renders in the shop's primary language instead of disappearing.

### Cache invalidation

CMS-side `afterChange` hooks call `revalidateTag` with three tags per mutation:

```text
cms.<tenantId>.<collection>.<key>   # e.g. cms.shop-1.pages.home
cms.<tenantId>.<collection>         # e.g. cms.shop-1.pages
cms.<tenantId>                      # broad sweep for the whole tenant
```

`<key>` is the slug for `pages`/`articles`, the `shopifyHandle` for product/
collection metadata, or the doc id for globals. Storefront read paths attach all
three tags so a single edit invalidates exactly what changed without sweeping the
whole site.

For tenant-root reads that aren't entity-specific (e.g. sitemap indexes), use
`cmsTenantRootTags(shop)` to get the matching fanout tags.

### Shop → tenant sync

`attachShopSync` listens on the Mongoose `Shop` model's `post('save')` and upserts
the matching `tenants` doc, so creating a shop in admin immediately makes a
tenant available in the CMS:

```ts
import { Shop } from '@nordcom/commerce-db';
import { attachShopSync } from '@nordcom/commerce-cms/shop-sync';
import { getPayloadInstance } from '@nordcom/commerce-cms/api';

attachShopSync(Shop.model, getPayloadInstance);
```

The hook is idempotent — repeated `attachShopSync` calls (Next.js hot reload,
retried boot, multiple `getPayload` callers) won't stack duplicate listeners.

## Required environment variables

| Variable                   | Required? | Purpose                                                                |
| -------------------------- | --------- | ---------------------------------------------------------------------- |
| `PAYLOAD_SECRET`           | yes       | Payload session + preview cookie signing.                              |
| `MONGODB_URI`              | yes       | Mongo connection (Payload + the shared `@nordcom/commerce-db` models). |
| `NEXTAUTH_SECRET`          | yes       | Verifies NextAuth JWTs in admin (falls back to `AUTH_SECRET`).         |
| `STOREFRONT_BASE_URL`      | no        | Base URL used by the admin live-preview iframe. Default `http://localhost:1337`. |
| `STOREFRONT_PREVIEW_SECRET`| yes (prod)| Secret expected by the storefront's `/[domain]/api/cms-preview` route. |
| `S3_BUCKET`                | no        | When all five `S3_*` vars are set, media uploads land in S3.           |
| `S3_ENDPOINT`              | no        |                                                                        |
| `S3_REGION`                | no        |                                                                        |
| `S3_ACCESS_KEY_ID`         | no        |                                                                        |
| `S3_SECRET_ACCESS_KEY`     | no        |                                                                        |

If any `S3_*` var is missing, `storagePluginFromEnv` returns `null` and Payload
uses its default disk storage. Set all five together.

## Layout

```text
packages/cms/
└── src/
    ├── index.ts              # `cmsPackageVersion`
    ├── cache.ts              # `cmsCache` (tagtree) + tenant-root tags
    ├── access/               # Access predicates
    │   ├── is-admin.ts
    │   ├── is-tenant-member.ts
    │   ├── public-read.ts
    │   ├── published-or-auth-read.ts
    │   ├── tenant-id-of.ts
    │   ├── tenant-scoped-read.ts
    │   └── index.ts
    ├── api/                  # Server-only read API
    │   ├── get-page.ts
    │   ├── get-article.ts
    │   ├── get-articles.ts
    │   ├── get-header.ts
    │   ├── get-footer.ts
    │   ├── get-business-data.ts
    │   ├── get-product-metadata.ts
    │   ├── get-collection-metadata.ts
    │   ├── get-payload-instance.ts
    │   ├── resolve-link.ts
    │   └── index.ts
    ├── auth/                 # Legacy bridge entry — empty
    ├── blocks/               # Block definitions + render layer
    │   ├── alert.ts banner.ts collection.ts columns.ts html.ts
    │   ├── media-grid.ts overview.ts rich-text.ts vendors.ts
    │   ├── render/
    │   │   ├── BlockRenderer.tsx
    │   │   ├── AlertBlock.tsx BannerBlock.tsx CollectionBlock.tsx
    │   │   ├── ColumnsBlock.tsx HtmlBlock.tsx MediaGridBlock.tsx
    │   │   ├── OverviewBlock.tsx RichTextBlock.tsx VendorsBlock.tsx
    │   │   ├── resolve-link-ref.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   └── index.ts
    ├── collections/          # Payload collections
    │   ├── _globals/         # `isGlobal` collections (header/footer/business-data)
    │   ├── _hooks/           # `buildRevalidateHooks` (tagtree adapter)
    │   ├── articles.ts pages.ts media.ts users.ts tenants.ts
    │   ├── collection-metadata.ts product-metadata.ts
    │   ├── build-users.ts    # Wires NextAuth strategies + role logic into `users`
    │   └── index.ts
    ├── config/               # `buildPayloadConfig` + locale helpers
    ├── fields/               # Reusable field groups (image/link/nav-item/seo)
    ├── plugins/              # Multi-tenant + S3 storage plugins
    ├── shop-sync/            # Shop -> tenant sync (Mongoose post-save hook)
    ├── test-utils/           # Integration test harness
    └── types/                # Re-exports the Payload-generated types
```

## Scripts

```bash
pnpm build           # tsc + vite build (emits to dist/)
pnpm typecheck       # tsc -noEmit
pnpm lint            # biome lint .
pnpm clean           # rm dist / .turbo / coverage / etc.
pnpm generate:types  # regenerate src/types/payload-types.ts
```

Tests run from the repo root (`pnpm test`). The CMS project's Vitest environment
is `happy-dom` and integration tests boot a real Payload against MongoDB — see
the "Running tests" section below.

## Generating types

Payload generates a single `payload-types.ts` from the live config. Re-run after
schema changes:

```bash
pnpm --filter @nordcom/commerce-cms generate:types
```

Output lands at `packages/cms/src/types/payload-types.ts` and is gitignored —
consumers wire it into their own tsconfig if they want strict typing on the
Local API.

## Running tests

Integration tests boot Payload against MongoDB. They require a writable Mongo
and write to suite-suffixed databases (`test_<suite>_<timestamp>`).

### Local MongoDB (default)

By default, tests connect to `mongodb://localhost:27017/test`. The simplest
setup:

```bash
docker run -d --name mongo-test -p 27017:27017 mongo:7
# …or use any other local Mongo install
```

Then:

```bash
pnpm dotenv -c -- vitest run --project @nordcom/commerce-cms
```

### Remote MongoDB (override)

To run tests against a managed Mongo (e.g. Atlas), set `MONGODB_URI_TEST` in
your shell or `.env.local`:

```bash
MONGODB_URI_TEST="mongodb+srv://…/test" pnpm dotenv -c -- vitest run --project @nordcom/commerce-cms
```

Atlas free tiers often hit `LockTimeout` errors during Payload bootstrap
because each boot touches many collections under load. Prefer local Mongo when
iterating; reserve remote for CI / final verification on a sized cluster.

### Environment variables consumed in tests

| Variable           | Default                                | Purpose                                              |
| ------------------ | -------------------------------------- | ---------------------------------------------------- |
| `MONGODB_URI_TEST` | `mongodb://localhost:27017/test`       | Test database connection.                            |
| `PAYLOAD_SECRET`   | `test-payload-secret`                  | Payload encryption secret.                           |
| `NEXTAUTH_SECRET`  | `test-nextauth-secret`                 | Used by the NextAuth → Payload auth bridge tests.    |

The `MONGODB_URI` from `.env.local` is intentionally shadowed by the test setup
so dev data is never touched.

## Deployment notes

### First-time setup

1.  Set the required env vars above on the admin app's deployment target.
2.  Deploy admin first — its first request boots Payload, which auto-creates
    collection indexes against the configured Mongo.
3.  Deploy the storefront. Its `/[domain]/api/cms-preview` route needs
    `STOREFRONT_PREVIEW_SECRET`; the admin's "preview" button sends
    `?secret=<value>` against that endpoint to flip Next.js draft mode on.

## Notes

-   This package depends on `@nordcom/commerce-db` for the Mongoose `Shop` model
    (used by `attachShopSync`), `@nordcom/commerce-errors` for typed errors, and
    `@tagtree/*` for the cache tag schema + Payload revalidation adapter.
-   The Shopify-aware blocks (`collection`, `vendors`, `overview`) do not import
    anything from `@shopify/*` — the storefront passes loaders in at the
    `BlockRenderer` boundary. Keep this package Shopify-free.
-   `src/auth/index.ts` is intentionally empty: the NextAuth → Payload bridge
    moved into co-located admin routes, but the subpath export is preserved so
    older consumers don't break their imports.
