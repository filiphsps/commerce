# SFREAD-11 — Prerender / `use cache` audit of the RSC-reachable Convex reads

Scope: every Convex read a React Server Component can reach in `apps/storefront` after the
`packages/db` re-home (all `@nordcom/commerce-db` services now call `convexServerQuery`/
`convexServerMutation` over `ConvexHttpClient`) plus the CMS dual-read loader and the account
`preloadQuery`. The boundary contract under `cacheComponents: true`: uncached I/O may run only
inside a `'use cache'` scope (it becomes part of cache-entry creation) or after the scope is
explicitly dynamic (`await connection()` / request data); `preloadQuery`/`fetchQuery` are
`no-store` and (for the account island) carry a per-user token, so they are dynamic-hole-only.

Enforced by `apps/storefront/src/api/use-cache-convex-boundary.test.ts` (static source gate),
`account/account-profile.test.tsx` (preloadQuery placement), `products/[handle]/
ppr-coexistence.test.tsx` (SFREAD-09 PPR gate), and `api/_loaders.cache.test.ts`. A full
`next build` cannot run in the agent sandbox; CI's storefront build is the final arbiter for the
cacheComponents clock guard — these suites are the in-repo proxy.

## Seam inventory

Transport legend — **T1**: `convexServerQuery/Mutation` (server-trust seam, `packages/db/src/db.ts`,
shared `ConvexHttpClient`); **T2**: `preloadQuery` (`convex/nextjs`, per-user RS256 token);
**T3**: `ConvexReactClient` WebSocket (client islands — not RSC, listed for completeness).

| # | Seam (consumer → Convex fn) | Transport | Boundary classification | WHY |
|---|---|---|---|---|
| 1 | `api/_shop-loader.ts` `Shop.findByDomain/findAll` → `db/shops:byDomain`/`byDomainWithCredentials`/`findAll` (via `packages/db`) | T1 | Inherits caller boundary; every RSC caller is `'use cache'` or dynamic (see 2–7) | React `cache()` dedups per render pass; the read itself is uncached HTTP, so the loader deliberately carries no boundary of its own — callers choose cached vs. dynamic. |
| 2 | `[domain]/[locale]/layout.tsx` `resolveTenantTypography`, `CachedShell` | T1 | `'use cache'` (`cacheLife('max')`, tenant-root tags) | The root layout renders before any request data; an uncached Convex fetch in that static scope would error/force-dynamic under cacheComponents. Tags let admin theme edits evict. |
| 3 | `[domain]/[locale]/metadata.ts` `generateMetadata` (and the per-page cached `generateMetadata`s) | T1 | `'use cache'` (`max`) | Same tenant read as the shell; metadata must stay prerenderable. |
| 4 | `utils/request-context.ts` `resolveTenantShop` (under `getRequestContext`) | T1 | `'use cache'` (`max`, tenant-root tags); the surrounding `getRequestContext` reads `headers()` and is therefore request-scoped | Runs on every request (cart, flags adapter); the cache collapses per-tenant lookups and keeps the uncached read out of any prerenderable scope that calls it transitively. |
| 5 | `api/shopify.ts` `ShopifyApiConfig` (`sensitiveData` credentials read), `utils/css-variables.tsx` | T1 | Inherits caller boundary — all callers sit inside `'use cache'` page/layout scopes or route-handler cached helpers | Credentials are inputs to the Shopify client built during cache creation; taint re-applied in `packages/db` survives because the value never crosses to the client. |
| 6 | `static-params.ts` + per-route `generateStaticParams` | T1 | Build-time scope (neither cached nor request-scoped) | `generateStaticParams` runs outside render; `safeCacheTag` in `_loaders` swallows the out-of-boundary `cacheTag` for exactly this caller. |
| 7 | Route handlers: sitemaps, `robots.txt`, `favicon.png`, `apple-icon` | T1 | `'use cache'` helper functions inside the handlers | Not RSC, audited because they share loader spine; the cached-helper pattern keeps tenant lookups prerender-cheap and error-transparent (a thrown lookup is never stored). |
| 8 | CMS getters (`api/header.ts`, `footer.ts`, `store.ts` businessData, `page.ts`, `article.ts`, `cms-blog.ts`, `metadata.ts` ×2) → `runCmsDualRead` flip path → `cms/read:*` | T1 | Inside the callers' `'use cache'` scopes (chrome under `CachedShell`, cached page bodies) — the flipped read is cache-entry content | When `CMS_READ_FLIP` serves Convex, the result replaces the Mongo result as Lane-1 content; it must be cached identically so the SFREAD-01 goldens stay byte-identical in both modes. Eviction rides the existing tenant-root/entity tags + the Convex→Next revalidate bridge. Media URLs (CMSMEDIA-03) resolve inside the Convex read functions to deterministic strings — they inherit this boundary; a pending-derivative fallback URL can be baked until tags evict, which is the documented trade-off. |
| 9 | CMS dual-read SHADOW (`api/_cms-shadow.ts` `runShadowComparison` → `cms/read:*` + `cms/read:recordDivergence` ledger) | T1 | OUTSIDE the cache boundary: scheduled via `after()` (post-response/prerender, waitUntil-backed); tracked detached promise only outside Next scopes (tests/scripts) | **Fixed in this task.** Previously the detached promise was spawned inline inside the getters' cached scopes, so its network I/O ran during cache-entry creation and a serverless freeze could drop ledger writes. `after()` is callable inside `'use cache'` (the work store is restored into cache scopes — `use-cache-wrapper` runs entry generation under `workAsyncStorage.run(workStore, …)`), runs only when the cached body executed (a fill — exactly when a fresh Mongo result exists), and never bakes anything into the entry: the comparison result is unreferenced, no request API or in-process clock is touched (the ledger stamps times Convex-side). |
| 10 | `account/page.tsx` `AccountSession` → `Shop.findByDomain({sensitiveData})` + `getAuthSession` (sessions/users via T1) | T1 | `connection()`-gated dynamic | Per-user reads (session cookie, credentials for the customer API) must never enter a shared cache entry; `AccountShell` stays `'use cache'` and takes the dynamic subtree as `children`. |
| 11 | `account/account-live-island.ts` `preloadAccountProfile` → `account/profile:get` | T2 | Request-scoped dynamic hole only (called from `AccountProfile` under `AccountSession`'s `await connection()`) | `preloadQuery` is `no-store` and carries the customer's minted JWT; inside `'use cache'` it would bake one user's snapshot + token into a shared entry. Pinned by `account-profile.test.tsx` and the boundary gate's import allowlist. |
| 12 | Flags: `utils/flags` (`evaluate-sync` inside cached scopes, async adapter outside) | — (no direct Convex call) | Cached scopes use sync `.evaluate(shop)` over the already-loaded shop record; the async adapter reads request context/session and is dynamic | Feature-flag targeting data arrives populated on the shop document from seam #1; no extra Convex read exists in RSC. |
| 13 | Lane-2 client islands: `pdp-availability-island(-live)`, `account-profile-island(-live)`, `reactive-island-provider-gate` | T3 | Client-only; the provider gate is `'use cache'`-safe (reads only `draftMode()`, the one request API permitted in cached scopes) and mounts no Convex chunk on the static path | SFREAD-07/09 gates: prerender markup is byte-identical with and without the island; sockets open only on interaction. Not server reads — listed so the inventory is total. |
| 14 | `middleware/storefront.ts` `Shop.findByDomain` | T1 | Node middleware — NOT RSC; out of audit scope by task definition | No `use cache` semantics apply; noted for completeness. |
| 15 | `api/_revalidate-convex.ts` + revalidate route | — (HMAC verify, no Convex read) | Route handler, request-scoped | The Convex→Next bridge's `ts` staleness check reads the clock in a request scope, which is legal; nothing here renders. |

## Clock-guard notes

- The loader spine (`_shop-loader`, `_loaders`, `_cms-shadow`, `_normalize-payload`, all nine
  getter modules) contains zero `Date.now()`/`new Date()` — pinned by the boundary gate. The
  divergence ledger stamps `_creationTime`/times Convex-side.
- The pre-migration mongoose rationale ("`.exec()` reads `new Date()`") in `layout.tsx`,
  `request-context.ts`, and `account/page.tsx` was stale; the comments now state the real
  constraint (uncached Convex HTTP read in a static scope). The boundaries themselves were already
  correct and are unchanged.

## Violations found → fixed

1. **Shadow scheduling inside cache boundaries** (seam #9): the fire-and-forget shadow/ledger leg
   was spawned inline within `'use cache'` scopes. Root-cause fix: `scheduleShadow()` in
   `api/_cms-shadow.ts` defers it through `after()` (fallback: tracked detached promise outside
   Next request/prerender scopes, preserving `flushCmsShadows` for tests). No feature was disabled;
   shadow coverage semantics (fires on cache fill) are unchanged and documented.

No other boundary violation was found: no `preloadQuery`/`fetchQuery` reachable from a cached
scope, no `ConvexHttpClient` constructed in the storefront, every `'use cache'` Convex read flows
through the audited seams above.
