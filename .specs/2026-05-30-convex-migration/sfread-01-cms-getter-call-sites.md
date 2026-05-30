# SFREAD-01 — Storefront CMS read-getter call-site inventory

Companion to [`cms-decision.md`](./cms-decision.md) §1.3 and [`spec.md`](./spec.md).

**Purpose.** Freeze the storefront's consumption of the 11 CMS read getters before the
Convex re-point. CUTOVER-04/05/06 re-point the getter *implementations* (Payload-on-Mongo →
Convex) behind unchanged signatures; this file is the committed map of every place the
contract is invoked, so the cutover can be proven exhaustive. Pair it with the two committed
gates that enforce the contract in CI:

- `packages/cms/src/api/cms-read-contract.golden.test.ts` — runtime output-shape freeze (exact
  shape on the canonical seed + null-on-missing for all 11 getters).
- `packages/cms/src/api/cms-read-contract.snapshot.ts` — hand-written type-level signature
  snapshot; `pnpm typecheck` fails on any signature/return-type drift.

All counts below are reproducible from `git rev-parse HEAD` on `feat/convex-migration`. Build
artifacts (`**/.next/**`, `**/dist/**`) and docs (`**/docs/**`, `*.mdx`) are excluded throughout.

---

## 1. The 11 getters (reconciliation vs cms-decision §1.3)

§1.3 names all 11 explicitly. UNIFY-02 froze the query (input) side of the first 9; SFREAD-01
adds `resolveLink` + `resolveTenantId` and freezes the output side of all 11.

| # | Getter | Module | Return contract |
|---|---|---|---|
| 1 | `getPage` | `packages/cms/src/api/get-page.ts` | `Promise<Page \| null>` (depth 2) |
| 2 | `getPages` | `packages/cms/src/api/get-pages.ts` | `Promise<PaginatedDocs<Page>>` (depth 0) |
| 3 | `getArticle` | `packages/cms/src/api/get-article.ts` | `Promise<Article \| null>` (depth 2) |
| 4 | `getArticles` | `packages/cms/src/api/get-articles.ts` | `Promise<PaginatedDocs<Article>>` (depth 1) |
| 5 | `getHeader` | `packages/cms/src/api/get-header.ts` | `Promise<Header \| null>` (depth 2) |
| 6 | `getFooter` | `packages/cms/src/api/get-footer.ts` | `Promise<Footer \| null>` (depth 2) |
| 7 | `getBusinessData` | `packages/cms/src/api/get-business-data.ts` | `Promise<BusinessDatum \| null>` (depth 1) |
| 8 | `getProductMetadata` | `packages/cms/src/api/get-product-metadata.ts` | `Promise<ProductMetadatum \| null>` (depth 2) |
| 9 | `getCollectionMetadata` | `packages/cms/src/api/get-collection-metadata.ts` | `Promise<CollectionMetadatum \| null>` (depth 2) |
| 10 | `resolveLink` | `packages/cms/src/api/resolve-link.ts` | `string` (pure; `''` on unpopulated relation) |
| 11 | `resolveTenantId` | `packages/cms/src/api/resolve-tenant-id.ts` | `Promise<string \| null>` (Shop._id → Tenant._id) |

**The 9 + 2 split:** the 9 find-backed getters (UNIFY-02) + `resolveLink` (pure URL builder,
consumed directly by header/footer components) + `resolveTenantId` (the Shop→Tenant bridge every
find-getter calls internally). All 11 are exported from `packages/cms/src/api/index.ts`.

`getPayloadInstance` is exported from the same barrel but is the in-process Payload singleton
boot, **not** a read getter — it is excluded from the 11 (and is consumed only by the getters
themselves + the test-mongo seed).

---

## 2. Read-path topology (3 layers)

The storefront does not call the frozen getters from its routes directly. There is a fixed
indirection:

```
route / component
  └─ @/api/_loaders.ts        (React cache() + per-tenant cache-tag fan-out)
       └─ apps/storefront/src/api/<wrapper>.ts   (thin: getter + normalizePayloadDoc)
            └─ @nordcom/commerce-cms/api  ← THE 11 FROZEN GETTERS (re-point target)
```

Exceptions: `resolveLink` is imported straight into the header/footer components (no wrapper);
`resolveTenantId` is internal to the 9 find-getters.

The **re-point surface** (what CUTOVER-04/05/06 actually swaps) is Layer-bottom: the direct
invocations of the 11 getters. Layers above consume them transitively behind unchanged
signatures and need no edit — they define the regression-test blast radius.

---

## 3. Tier 1 — re-point surface: direct invocations of the 11 getters (production)

**25 call sites across 19 files.** This is the authoritative cutover-verification list.

### 3a. Frozen getter invocations in storefront wrappers — 9 sites / 7 files

| Getter | File | Line |
|---|---|---|
| `getPages` (alias `CmsGetPages`) | `apps/storefront/src/api/page.ts` | 18 |
| `getPage` (alias `CmsGetPage`) | `apps/storefront/src/api/page.ts` | 36 |
| `getArticle` | `apps/storefront/src/api/article.ts` | 28 |
| `getArticles` | `apps/storefront/src/api/cms-blog.ts` | 34 |
| `getHeader` | `apps/storefront/src/api/header.ts` | 24 |
| `getFooter` | `apps/storefront/src/api/footer.ts` | 22 |
| `getBusinessData` | `apps/storefront/src/api/store.ts` | 216 |
| `getProductMetadata` | `apps/storefront/src/api/metadata.ts` | 24 |
| `getCollectionMetadata` | `apps/storefront/src/api/metadata.ts` | 47 |

### 3b. `resolveLink` (cms/api variant) in components — 7 sites / 3 files

> Note: there is a **second, unrelated** `resolveLink` at `apps/storefront/src/blocks/resolve-link.ts`
> (returns an object, scheme-gated) consumed by the block renderers. That one is NOT part of the
> frozen 11 and is excluded here. Only the `@nordcom/commerce-cms/api` import counts.

| File | Lines | `grep -c "resolveLink("` |
|---|---|---|
| `apps/storefront/src/components/footer/footer.tsx` | 206, 228 | 2 |
| `apps/storefront/src/components/header/header-menu.tsx` | 365, 455, 513, 580 | 4 |
| `apps/storefront/src/components/header/header-navigation.tsx` | 62 | 1 |

### 3c. `resolveTenantId` internal invocations — 9 sites / 9 files

Called once by each of the 9 find-getters (`resolveTenantId(payload, shop.id)`):
`get-page.ts`, `get-pages.ts`, `get-article.ts`, `get-articles.ts`, `get-header.ts`,
`get-footer.ts`, `get-business-data.ts`, `get-product-metadata.ts`, `get-collection-metadata.ts`
(all under `packages/cms/src/api/`).

---

## 4. Tier 2 — storefront read-path consumers (production)

The routes/components/loaders that consume the contract through the wrapper + `_loaders` layers.
These don't get re-pointed, but every one must stay green post-cutover. **19 call sites / 14 files.**
(Shopify-namespace look-alikes `ShopifyPageApi`/`ShopifyPagesApi`/`BlogArticleApi` are excluded —
they are Shopify data fetchers, not CMS-contract consumers.)

| Wrapper | Consumer site(s) |
|---|---|
| `PageApi` | `app/[domain]/[locale]/[...slug]/page.tsx:65,129`; `components/cms/cms-content.tsx:31` |
| `PagesApi` | `app/[domain]/[locale]/[...slug]/static-params.ts:29`; `app/[domain]/sitemaps/pages.xml/route.ts:28` |
| `FooterApi` | `components/footer/footer.tsx:104` |
| `ArticleApi` | `app/[domain]/[locale]/blogs/[blog]/[handle]/page.tsx:54,126` |
| `InfoBarApi` | `components/header/info-bar.tsx:32` |
| `HeaderApi` | `components/header/header.tsx:31` |
| `ProductMetadataApi` | `app/[domain]/[locale]/products/[handle]/page.tsx:86,191` |
| `CollectionMetadataApi` | `app/[domain]/[locale]/collections/[handle]/page.tsx:77,189` |
| `BlogApi` | `app/[domain]/[locale]/blogs/[blog]/page.tsx:42,90`; `app/[domain]/[locale]/blogs/[blog]/[handle]/static-params.ts:37`; `app/[domain]/sitemaps/[locale]/blogs.xml/route.ts:65` |
| `BusinessDataApi` | `api/info-bar.ts:19` (the `InfoBarApi` wrapper delegates) |

All ten wrappers are additionally re-exported through `apps/storefront/src/api/_loaders.ts`
(React `cache()` + cache-tag wrapping at lines 97–151).

---

## 5. Test call sites (regression scope, not re-point surface)

Behavioral coverage of the 11 getters lives in (`grep -c` of getter invocations):

| File | Calls |
|---|---|
| `packages/cms/src/api/cms-read-contract.golden.test.ts` (SFREAD-01, new) | 28 |
| `packages/cms/src/api/tenant-filter-contract.test.ts` (UNIFY-02) | 20 |
| `packages/cms/src/api/resolve-tenant-id.test.ts` | 15 |
| `packages/cms/src/api/api.test.ts` | 13 |
| `packages/cms/src/api/resolve-link.test.ts` | 7 |

Plus the storefront wrapper tests (`page.test.ts`, `article.test.ts`, `header.test.ts`,
`footer.test.ts`, `info-bar.test.ts`, `metadata.test.ts`, `store.test.ts`, `cms-blog.test.ts`)
and the locale-map normalization freeze (`apps/storefront/src/api/_normalize-payload.test.ts`).

---

## 6. Reconciliation vs the cms-decision §1.3 "38 call sites across 33 files"

**Getter count: exact.** 11 getters as enumerated in §1 — fully reconciled to §1.3.

**Call-site count: documented discrepancy.** The §1.3 figure ("38 / 33") is an estimate from the
decision-authoring snapshot; the tree has since evolved (the `_loaders.ts` React-cache layer and
the Shopify blog-wrapper indirection changed the consumption topology). The real, grep-backed
numbers on this commit are:

| Slice | Call sites | Files |
|---|---|---|
| Tier 1 — re-point surface (direct getter invocations) | **25** | **19** |
| Tier 2 — storefront read-path consumers | 19 | 14 |
| **Combined production (Tier 1 ∪ Tier 2)** | **44** | **32** |

The §1.3 "33 files" lands within one of the combined production file count (**32**) — effectively
confirmed. The "38 call sites" sits between the strict re-point surface (25) and the full
production consumption (44); the exact number is definitional (whether one counts the internal
`resolveTenantId` plumbing, the wrapper definitions, the `_loaders` re-wraps, and/or the leaf
route consumers). It is **not** the naive "33 call sites / 16 files" the spec warned against.

**For CUTOVER:** use Tier 1 (25 / 19) as the exhaustive re-point checklist and Tiers 1+2 (32 files)
as the regression-test blast radius. The golden + type-snapshot gates guarantee any drift in the
11 getters' shapes or signatures fails CI regardless of call-site bookkeeping.
