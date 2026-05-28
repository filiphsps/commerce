# Storefront Performance Assessment — 2026-05-28

Each of the 11 flagged anti-patterns was verified against the real code. Several were
**already fixed** (pooling, PPR via `cacheComponents`, parallel metadata fetches); the
genuinely high-leverage problems are the GraphQL `no-store` default, the middleware
per-request DB + Shopify round-trips, and the monolithic 250×-everything product fragment.

All recommendations are root-cause fixes per CLAUDE.md — no reverts, no empty-array stubs,
no disabling of features.

## Verdict per item

| # | Flag | Verdict | Impact | Effort |
|---|------|---------|--------|--------|
| 1 | GraphQL default `cache:'no-store'` | CONFIRMED | high | small |
| 2 | Apollo link TTL ~8h | CONFIRMED (but value is fine; #1 nullifies it) | low–med | small |
| 3 | `Shop.findByDomain` uncached | PARTIAL — cached loader exists, bypassed by 75 files | high | medium |
| 4 | `ShopifyApolloApiClient` pooling | DONE — pool exists; residual: config runs on every call | med–high | small |
| 5 | Product fragment 250×everything | CONFIRMED | high | large |
| 6 | No PPR | FALSE — `cacheComponents: true` + `'use cache'` | — | — |
| 7 | Images unoptimized + wildcard hosts | CONFIRMED | high | medium |
| 8 | Middleware expensive every request | CONFIRMED | critical | medium |
| 9 | Sequential metadata fetches | MOSTLY FALSE — already `Promise.all`'d | low–med | small |
| 10 | `generateStaticParams` limited to 5 | PARTIAL — products=5, collections=all | low | small |
| 11 | Router staleTimes 2m/1h | CONFIRMED — intentional, *helps* perf | none | — |

## Ranked by impact-per-effort

1. **(8) Middleware DB + Shopify round-trip on every request** — `apps/storefront/src/middleware/storefront.ts:81` runs `Shop.findByDomain(hostname, { sensitiveData: true })` (full credential doc from Mongo) on every matched request; `:258-260` additionally does a 2nd `findByDomain` + `ShopifyApiClient` + `LocalesApi` (a Shopify Storefront GraphQL call) on cookie-less requests — all on the edge critical path. `proxy.ts:8` matcher covers every non-asset, non-prefetch request. Fix: process-level TTL/LRU cache for `hostname → { domain, defaultLocale, locales }` (the dev path already does this for `findAll` at `storefront.ts:28`); use a lean projection instead of `sensitiveData`; cache `LocalesApi` per shop. React `cache()` does NOT help here (middleware is not RSC).

2. **(1) GraphQL queries default to `cache: 'no-store'`** — `apps/storefront/src/utils/abstract-api.ts:119` `cache: fetchPolicy ?? 'no-store'`. The per-request `context.fetchOptions` replaces the `HttpLink`'s `next: { revalidate: 28800 }` (`api/client.ts:32`), so the 8h default is dead and every Storefront query is uncached at the fetch layer. `'use cache'` page boundaries mask it for page renders, but route handlers (sitemaps, robots, favicon/apple-icon), and any non-`use cache` path hit Shopify every request. Fix: flip the default to a cached policy (omit `cache`, let link `revalidate` + tags govern) and pass `no-store` explicitly only for genuinely dynamic queries (cart/customer/checkout).

3. **(4) `ShopifyApiConfig` re-runs on every pooled client call** — pooling itself is DONE (`api/_apollo-pool.ts` `getApolloClient`, keyed `shop.id::locale.code`). But `api/shopify.ts:108` calls `ShopifyApiConfig({ shop, buyerIp })` — an **uncached** `Shop.findByDomain(domain, { sensitiveData: true })` (`shopify.ts:37`) plus `createStorefrontClient` — *before* the pool lookup, so it runs even on a pool hit. Fix: move config resolution inside the pool factory (runs only on miss) or memoize `ShopifyApiConfig` per shop.

4. **(3) `Shop.findByDomain` not consistently request-memoized** — a React-`cache()` wrapper exists (`api/_loaders.ts:35`) and 42 files use it, but 75 files import the raw uncached `Shop` from `@nordcom/commerce-db` (incl. `shopify.ts`, middleware). Two caveats documented in `_loaders.cache.test.ts:73`: (a) `cache()` only dedupes inside an RSC render pass; (b) it keys on argument *reference* — passing a fresh `{ sensitiveData: true }` literal each call is a guaranteed cache miss. Fix: route storefront callers through `_loaders`, normalize the options arg, and add a TTL cache for non-RSC contexts. Keep React out of the `db` package.

5. **(7) Images unoptimized + wildcard remotePatterns** — `next.config.js:71` `unoptimized: true` (`// FIXME`), `:79` `hostname: '*'` (`// FIXME`). No resizing/format negotiation → large payloads on every product image; wildcard lets Next proxy any https host (abuse/SSRF surface). Fix: enable optimization (or wire the commented Cloudflare loader at `:73`), restrict `remotePatterns` to Shopify CDN + known tenant hosts. Risk: must whitelist all real image sources for the multi-tenant fleet first.

6. **(5) Monolithic product fragment** — `api/shopify/product/queries.ts`: `options(first: 250)` (L46), `variants(first: 250)` (L160), `images(first: 250)` (L242), plus 9 metafields and nested `quantityBreaks` `references(first: 25)`. One `PRODUCT_FRAGMENT` serves PDP, lists, collections, search, and recommendations. Fix: split a lean card fragment (id, handle, title, featuredImage, priceRange, availableForSale) from the full PDP fragment; cap variants/images to a real page size; fetch metafields only on PDP. Risk: hydrogen-react `getProductOptions` needs `variants`/`optionValues`/`adjacentVariants` on the PDP path — keep those.

7. **(2) 8h link-level revalidate** — `api/client.ts:32` and the fetch client `shopify.ts:175` both set `revalidate: 28_800`. The value is reasonable as a safety-net floor because Shopify webhooks invalidate via tags (`revalidateTag`/`evictApolloClient`). Real issue is only that #1 currently overrides it. Fixing #1 makes this active; no separate change needed.

8. **(9) Metadata fetches** — already parallelized: `page.tsx:82` `Promise.all([LocalesApi, ProductMetadataApi])`, `:128` `Promise.all([params, queryParams])`. The remaining `Shop → api → ProductApi` chain (L60/65/67) is a genuine data dependency. Residual inefficiency: `buildMetadata` uses `ShopifyApiClient` (fetch) while `ProductPage` uses `ShopifyApolloApiClient` (Apollo) — the same product is fetched twice via transports that don't share a cache (both wrapped in `'use cache'`, so cross-request it's covered). Fix: share one cached `ProductApi`/client between metadata and page.

9. **(10) `generateStaticParams`** — products capped at `limit: 5` (`products/[handle]/static-params.ts:39`); collections build ALL (`collections/[handle]/static-params.ts:35`, up to `first: 250`); top-level builds one locale (en-US) per shop (`[locale]/static-params.ts:30`). With `cacheComponents`/ISR the non-prebuilt products render on demand then cache — the cap is a cold-start tradeoff, not a correctness bug. Optional: prebuild top-N best-sellers instead of arbitrary first-5.

10. **(6) PPR** — NOT a finding. `next.config.js:23` `cacheComponents: true` (Next 16's successor to `ppr`), and pages use `'use cache'` + `cacheLife` (e.g. `products/[handle]/page.tsx:159-160`).

11. **(11) staleTimes** — `next.config.js:61-64` dynamic 120s / static 3600s. This is client router cache; longer values *improve* perceived navigation and freshness is owned by tags. Intentional and beneficial — leave as-is.

## Changeset notes

Most fixes live in `apps/storefront` (no changeset — app is ignored). A changeset IS required if a fix
touches a non-ignored package: e.g. adding a lean projection / domain-only resolver to `@nordcom/commerce-db`
(item 8/3), or moving the product fragment into `@nordcom/commerce-shopify-graphql` (item 5). Pick `patch`
for internal/bugfix, `minor` for additive API.
