# `@nordcom/commerce-cms`

The multi-tenant CMS toolkit. Content rows live in the Convex deployment
([`packages/convex`](../convex)); this package owns everything that gives those
rows meaning — the **field descriptors** that define every content shape, the
**editor** primitives the admin app mounts at `/cms`, the **block render layer**
the storefront uses, and the **cache taxonomy** both sides of the invalidation
contract share.

Built on Payload 3.x before the Convex migration — see
`.specs/2026-05-30-convex-migration/` for that history. There is no Payload (and no
separate database connection) anywhere in the current package.

## Why

A single deployment serves many tenants, and each tenant needs its own pages,
articles, navigation, business data, and per-product/collection metadata. This
package exists so the platform has exactly one canonical definition of CMS content:

-   **One schema, many tenants.** Every content table keys on the shop's id
    (shop == tenant). The descriptor definitions here generate the Convex table
    validators, so the editor, the read contract, and the storage schema can never
    drift apart.
-   **Shopify-aware blocks, no Shopify dependency in the CMS.** The block model is
    defined here; data loaders for `collection` / `vendors` / `overview` blocks are
    injected by the storefront, so this package stays free of Shopify imports.
-   **Cache invalidation by construction.** The `cms` tag taxonomy is defined once
    (`cache-descriptor.ts`, `server-only`-free) and consumed from both sides:
    the Next.js read adapter (`cache.ts`) and the Convex revalidation pipeline,
    which derives identical tags from each publish event.

## Descriptors and codegen

Content shapes are declared with the builders from
`@nordcom/commerce-cms/descriptors` (`textField`, `blocksField`,
`relationshipField`, `localized`, …). `pnpm cms:gen` derives every downstream
artifact from them:

| Artifact | Path | Consumer |
| --- | --- | --- |
| Editor-action wrappers | `apps/admin/src/lib/cms-actions/_generated/` | Admin server actions |
| Read-contract types | `packages/cms/src/types/content-types.ts` | Storefront getters |
| Content-table validators | `packages/convex/convex/tables/cms.ts` | Convex schema |
| Localized-path manifest | `packages/convex/convex/cms/localized_paths.ts` | Convex i18n shredding |

CI fails on drift via `pnpm cms:gen:check` — edit descriptors, rerun the codegen,
commit both.

## Editor

`@nordcom/commerce-cms/editor` (+ `editor/form`, `editor/ui`, `editor/manifests`,
`editor/richtext`, `editor/preview`) is the native authoring stack the admin app
mounts:

-   **Manifests** (`editor/manifests/`) — one `defineCollectionEditor` per
    collection slug (`pages`, `articles`, `header`, `footer`, `businessData`,
    `productMetadata`, `collectionMetadata`, `media`, `users`, `shops`, …) wiring
    fields, routes, and access predicates.
-   **Form core** (`editor/form/`) — descriptor-driven form state, autosave,
    locale-bucket editing for localized fields.
-   **UI** (`editor/ui/`) — the edit/list/new/version page components.
-   **Richtext + live preview** — the ProseMirror-based editor and the
    origin-verified preview bridge into the storefront.

Editor saves flow through the admin's generated action wrappers into the Convex
`cms/documents` functions (drafts, autosave with OCC, versions, publish).

## Reading content (storefront)

The storefront reads published content straight from the Convex `cms/read`
functions through its own getters (`apps/storefront/src/api/*`); this package is
not in that wire path. What the storefront does import from here:

```tsx
import { BlockRenderer } from '@nordcom/commerce-cms/blocks/render';
import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Page } from '@nordcom/commerce-cms/types';
```

`BlockRenderer` dispatches on `block.blockType` and recurses through nested
`columns` blocks. Loaders are passed in so this package stays Shopify-agnostic:

```tsx
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

## Public API

| Subpath | Source | Purpose |
| --- | --- | --- |
| `./descriptors` | `src/descriptors/` | Field-descriptor builders + types — the schema source of truth. |
| `./editor`, `./editor/*` | `src/editor/` | Manifests, form core, UI pages, richtext, live preview. |
| `./blocks`, `./blocks/render` | `src/blocks/` | Block registry + `BlockRenderer` and the `BlockLoaders` contract. |
| `./fields` | `src/fields/` | Reusable descriptor groups (`imageField`, `linkField`, `seoGroup`). |
| `./api` | `src/api/` | `resolveLink` — the pure link resolver. |
| `./types` | `src/types/` | Generated read-contract types (`content-types.ts`). |
| `./cache` | `src/cache.ts` | `cmsCache` (tagtree Next adapter) + `cmsTenantRootTags()`. |
| `./cache-descriptor` | `src/cache-descriptor.ts` | The shared `cms` tag schema (`server-only`-free). |
| `./media`, `./media/*` | `src/media/` | Image size presets, MIME allowlist, sharp derivative pipeline. |
| `./layout` | `src/layout/` | Chrome slot registry (`resolveChromeLayout`). |
| `./extensions` | `src/extensions/` | `ShopExtensionManifest` + the pure `resolveExtensions` composer. |

### Cache invalidation

Publishing a document runs the Convex revalidation pipeline
(`packages/convex/convex/revalidate/`), which computes tags from the shared
schema and delivers signed events to the storefront's `/api/revalidate/convex`
route:

```text
cms.<shopId>.<collection>.<key>   # e.g. cms.shop-1.pages.home
cms.<shopId>.<collection>         # e.g. cms.shop-1.pages
cms.<shopId>                      # broad sweep for the whole tenant
```

`<key>` is the slug for `pages`/`articles`, the `shopifyHandle` for product/
collection metadata, or the doc id for globals. Storefront read paths attach all
three tags so a single edit invalidates exactly what changed. For tenant-root
reads that aren't entity-specific (e.g. sitemap indexes), use
`cmsTenantRootTags(shop)`.

## Required environment variables

The package itself reads no database connection — Convex access happens in the
apps (via `@nordcom/commerce-db`) and in the deployment. Relevant variables:

| Variable | Where | Purpose |
| --- | --- | --- |
| `STOREFRONT_BASE_URL` | admin | Base URL for the live-preview iframe. |
| `STOREFRONT_PREVIEW_SECRET` | both | Secret for `/[domain]/api/cms-preview` draft mode. |
| `CONVEX_REVALIDATE_SECRET` | storefront + deployment | HMAC for the revalidation delivery route. |
| `S3_*` / `R2_PUBLIC_ENDPOINT` | media | Legacy key-addressed URLs for migrated media; new uploads land in Convex file storage. |

## Scripts

```bash
pnpm build           # vite build (emits to dist/)
pnpm typecheck       # tsc -noEmit
pnpm lint            # biome lint .
pnpm cms:gen         # regenerate every descriptor-derived artifact
pnpm cms:gen:check   # CI drift gate for the same artifacts
```

Tests run from the repo root (`pnpm test`). The CMS project's Vitest environment
is `happy-dom`; no live backend is required.

## Notes

-   This package depends on `@nordcom/commerce-db` for the theme leaf and entity
    types, `@nordcom/commerce-errors` for typed errors, and `@tagtree/*` for the
    cache tag schema.
-   The Shopify-aware blocks (`collection`, `vendors`, `overview`) do not import
    anything from `@shopify/*` — the storefront passes loaders in at the
    `BlockRenderer` boundary. Keep this package Shopify-free.
