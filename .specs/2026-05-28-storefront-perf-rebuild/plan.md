# Storefront Recovery & Rebuild — Phased Remediation Roadmap

**Date:** 2026-05-28
**Baseline:** `master` @ `2cccd3f9a` (all four gates green).
**Source:** cross-referenced from `assess-{functional,ios,performance,tenant,design,build}.md` + structured dimension findings.

## How to read this

Phases run in priority order P0 → P5. Within a phase, tasks are **ordered** — do them top to bottom; later tasks may assume earlier ones. Each task carries: impact, effort, risk, a root-cause approach (per CLAUDE.md — no symptom patches), and the changeset / regression-test requirement.

**JSDoc is a global gate (CLAUDE.md), not a per-task line item.** Every new or modified function and component — including the new files in P0-2 (`product-card-boundary.tsx`), P0-3 (the add helper), P0-8 (`cart-empty.tsx`), P5-2 (error/404/empty-state components), P5-3 (loading skeleton), P5-4 (Button variants), and every other new symbol introduced anywhere in this roadmap — MUST carry a JSDoc block with purpose plus `@param`/`@returns`/`@throws` where applicable. Reviewers gate on this; do not defer it to lint/review discovery.

**Changeset rule (verified from `.changeset/config.json`):** `ignore: ["@nordcom/*", "!@nordcom/cart-*"]`. Only `@nordcom/cart-*` **runtime** changes need a changeset. `apps/storefront`, `@nordcom/commerce-db`, `@nordcom/commerce-cms`, `@nordcom/commerce-shopify-graphql`, `@nordcom/commerce-errors` are all ignored → no changeset. Test-only additions to cart packages do not need a changeset.

**Already verified DONE (no task — do not re-touch):** CartLine cart-core migration + `'use client'`; picker add-to-bag wiring (inline/float/sheet); single-variant fast-path + multi-variant picker open; `resolveInitialVariantId` option-param matching; GID double-encode guard; `selectVariant` dep stabilization; animation-timeline `@supports`; SheetPicker safe-area; Modal `h-dvh` de-nesting; `100dvh` page-content; chip `touch-action`; Apollo client pooling; `cacheComponents` + `'use cache'`; parallelized metadata fetches; router `staleTimes`; checkout handoff; cart persistence; quantity update / line removal wiring.

---

## Phase P0 — Functional correctness & crash safety  (13 tasks)

**Goal:** Eliminate every still-open crash vector and silent-failure path so the storefront is trustworthy on real iOS devices and a green CI is believable. Highest priority — everything else waits on this.

### P0-1 — Feature-detect `MediaQueryList.addEventListener` in `useIsDesktop`
- **file(s):** `apps/storefront/src/components/product-options/use-is-desktop.ts`
- **impact:** critical · **effort:** trivial · **risk:** low
- **root cause:** `:25` calls `mql.addEventListener('change', handler)` unconditionally. On iOS ≤13 / Safari <14 `MediaQueryList.addEventListener` is `undefined` → `TypeError` thrown inside the effect → propagates to the page-level `fallbackRender={() => null}` → blank body. The hook now runs in `product-card-picker` (every card) + the PDP picker, so it is on essentially every shoppable page.
- **approach:** `if (mql.addEventListener) mql.addEventListener('change', handler); else if (mql.addListener) mql.addListener(handler);` with a symmetric teardown (`removeEventListener` / `removeListener`). Keep the SSR-null sentinel. Do **not** widen the `typeof window` guard as the "fix" — the throw is the listener API, not `matchMedia`.
- **needs-changeset:** no · **needs-regression-test:** yes (see P0-11)

### P0-2 — Per-card error isolation so one card cannot blank the page
- **file(s):** `apps/storefront/src/components/product-card/product-card.tsx` (wrap), new `product-card/product-card-boundary.tsx`; alt: `apps/storefront/src/components/product-card/primitives/product-card-cta.tsx` + `product-card-picker.tsx`
- **impact:** high · **effort:** small · **risk:** low-medium
- **root cause:** `useCartActions()` (the throwing hook) runs before any guard in both card primitives, and the only error boundaries are two page-level `fallbackRender={() => null}` wrappers in `providers-registry.tsx`. A transient `CartProviderError` from one card nulls the whole subtree. Reordering the hook past the sel/picker guard does **not** fix it (cart context is independent of sel/picker).
- **approach (preferred, no changeset):** wrap each `ProductCard` in an isolating `ErrorBoundary` whose fallback renders the static (non-interactive) card, so a single card's throw is contained. Document the WHY (transient cache-request cart-context absence). **Alt** (needs changeset): add a non-throwing `useMaybeCartActions()` to `@nordcom/cart-react` and read it defensively. Prefer the boundary to avoid a cart-package release.
- **needs-changeset:** no (boundary) / yes (if cart-react maybe-hook) · **needs-regression-test:** yes

### P0-3 — Extract a shared product-card snapshot + add helper
- **file(s):** new `apps/storefront/src/components/product-card/use-add-product-card-line.ts` (or `add-helpers.ts`); refactor `primitives/product-card-cta.tsx`, `primitives/product-card-picker.tsx`
- **impact:** high · **effort:** small · **risk:** low
- **root cause:** `ProductSnapshot` construction + `addLine` call are duplicated verbatim across `product-card-cta.tsx:33-58` and `product-card-picker.tsx`. Duplication is why analytics + error handling were each only half-added. There is no single place to add them.
- **approach:** one helper that takes the resolved variant + product and returns `{ buildSnapshot, addProductCardLine }`. Both primitives call it. This is the home for P0-4 and P0-5. JSDoc the helper.
- **needs-changeset:** no · **needs-regression-test:** yes (covered by P0-11 picker-primitive tests)

### P0-4 — Emit `add_to_cart` analytics from the product-card add path
- **file(s):** `apps/storefront/src/components/product-card/use-add-product-card-line.ts` (from P0-3)
- **impact:** high · **effort:** small · **risk:** low
- **root cause:** zero `useTrackable`/`postEvent`/`add_to_cart` anywhere under `components/product-card/`. Card adds are invisible to GA4 while PDP adds (`products/add-to-cart.tsx:121`) and checkout (`utils/checkout.ts:129`) do emit — conversions are under-reported.
- **approach:** emit `add_to_cart` from the shared helper, mirroring the `gtm.ecommerce` payload shape in `add-to-cart.tsx`. Single emission point covers both the single-variant fast path and the picker path.
- **needs-changeset:** no · **needs-regression-test:** yes
- **depends on:** P0-3

### P0-5 — Honor `addLine` result on card adds (toast on failure, close picker only on success)
- **file(s):** `apps/storefront/src/components/product-card/use-add-product-card-line.ts`, `primitives/product-card-cta.tsx`, `primitives/product-card-picker.tsx`
- **impact:** high · **effort:** small · **risk:** low
- **root cause:** `product-card-cta.tsx:58` discards the `addLine` result; `product-card-picker.tsx` awaits then calls `picker?.setOpen(false)` unconditionally. A sold-out/network failure silently dismisses the picker with no feedback. PDP `add-to-cart.tsx:116-119` correctly does `if (!result.ok) toast.error(result.message)`.
- **approach:** in the shared helper, check `result.ok`; `toast.error(result.message)` on failure; return ok/fail so callers only `setOpen(false)` on success. Use the existing toast util the PDP uses.
- **needs-changeset:** no · **needs-regression-test:** yes
- **depends on:** P0-3

### P0-6 — Guard `FloatPicker` backdrop-blur for pre-15.4 WebKit
- **file(s):** `apps/storefront/src/components/product-card/picker/float.tsx`, `apps/storefront/src/app/globals.css`
- **impact:** medium · **effort:** small · **risk:** low
- **root cause:** `float.tsx:56` ships `bg-white/97 … backdrop-blur-md` with no `@supports` guard. Phones are mitigated only because B1/C1 routes mobile → SheetPicker; iPadOS 14/15 at ≥768px still renders FloatPicker with `backdrop-filter` → the documented pre-15.4 GPU crash.
- **approach:** wrap the blur in `@supports (backdrop-filter: blur(1px))` with an opaque `bg-white` fallback, or drop `backdrop-blur-md` for a solid surface. Do not rely on the phone-only sheet routing.
- **needs-changeset:** no · **needs-regression-test:** no (CSS; manual iPad-width check)

### P0-7 — Resolve `useVariantUrlSync` deps/comment drift
- **file(s):** `apps/storefront/src/hooks/useVariantUrlSync.ts`, `apps/storefront/src/hooks/useVariantUrlSync.test.ts`
- **impact:** low · **effort:** trivial · **risk:** low
- **root cause:** `:55` still lists `searchParams` in the deps, while the test comment `:81` asserts it was "removed entirely". The `prevKeyRef` guard makes it functionally safe, but the drift hides the real mechanism and a future edit could silently regress the double-replace.
- **approach (preferred):** rewrite the misleading test comment at `useVariantUrlSync.test.ts:81` to describe the actual mechanism — the `prevKeyRef` guard — leaving the dep array exhaustive. **Do NOT** drop `searchParams` from the dep array while it is still read inside the effect body: Biome `useExhaustiveDependencies` (already at 3 warnings per assess-build) would flag it, and CLAUDE.md forbids `biome-ignore` / underscore / `void` suppression — so the "remove the dep" path creates an unsuppressable lint warning and is off the table. **Alt (only if you want code to literally not depend on the value):** read `searchParams` via a ref synced in a separate effect so it is genuinely not a render dependency — then the dep array can shrink without lying to the linter. Default to the comment rewrite; keep the test green.
- **needs-changeset:** no · **needs-regression-test:** yes (update existing)

### P0-8 — i18n empty-cart state with a continue-shopping CTA
- **file(s):** `apps/storefront/src/components/cart/cart-lines.tsx`, cart i18n dictionary (`cart` namespace), new `cart/cart-empty.tsx`; `cart-sidebar.tsx` (suppress summary when empty)
- **impact:** medium · **effort:** small · **risk:** low
- **root cause:** `cart-lines.tsx:33` returns `<Label>There are no items in your cart.</Label>` — hardcoded English despite `tCart` in scope; `CartSidebar` still renders the full disabled-checkout summary alongside it.
- **approach:** add a `cart` i18n key; render a dedicated `CartEmpty` component with a trailing-slash continue-shopping link; suppress the order-summary sidebar when the cart is empty. Functional + i18n only here; visual polish (illustration) lands in P5-2.
- **needs-changeset:** no · **needs-regression-test:** yes

### P0-9 — Replace `new Error` in the picker registry with a `@nordcom/commerce-errors` class
- **file(s):** `apps/storefront/src/components/product-card/picker/registry.ts`; if no class fits: `packages/errors/src/*` (+ `*ErrorKind` + `getErrorFromCode` case)
- **impact:** low · **effort:** small · **risk:** low
- **root cause:** `registry.ts:36` throws `new Error(...)` — violates the errors-via-`@nordcom/commerce-errors` rule.
- **approach:** throw a typed commerce error (e.g. a registration/not-registered kind). Add the class + kind + `getErrorFromCode` case in the errors package if none exists.
- **needs-changeset:** no (errors pkg is ignored) · **needs-regression-test:** no

### P0-10 — Drop unused `shop` prop + narrow the cart-page cache scope
- **file(s):** `apps/storefront/src/components/cart/cart-content.tsx`, `apps/storefront/src/app/[domain]/[locale]/cart/page.tsx`
- **impact:** low · **effort:** small · **risk:** low
- **root cause:** `cart-content.tsx:15` declares an unused `shop: OnlineShop` (violates no-unused-props). `cart/page.tsx:64-65` wraps the whole page incl. `getDictionary` in `'use cache'; cacheLife('max')` — i18n updates can freeze until purge.
- **approach:** remove the unused prop entirely. Narrow the `'use cache'` boundary so the dictionary is not frozen at `max` (scope the cache to genuinely static fragments, or use a shorter `cacheLife` for the dictionary-bearing region). Do not blanket-disable caching — scope it.
- **needs-changeset:** no · **needs-regression-test:** no

### P0-11 — Regression tests for the iOS-fix + picker + option-selection surfaces
- **file(s):** new `use-is-desktop.test.ts`, `product-options/context.test.ts`, `renderers/chip-class.test.ts`, `product-options/primitives/more.test.tsx`; expand `primitives/product-card-picker.test.tsx`, `product-options/primitives/overlay.test.tsx`
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** the exact files the recent iOS commits touched are untested: `use-is-desktop.ts` (no dedicated test; SSR-null, subscribe/unsubscribe, breakpoint flip, **and the P0-1 feature-detect fallback** unasserted), `product-options/context.ts` (no dedicated test, 50% branch), and `product-card-picker.tsx` primitive (35% stmt / 9% branch) — selection behavior largely unverified. Per assess-build, three more files on this same option-selection surface have coverage holes the P0 add path relies on: `renderers/chip-class.ts` (NO dedicated test), `product-options/primitives/more.tsx` (NO dedicated test, 91.66% indirect), and `product-options/primitives/overlay.tsx` (70.83%, L28-29 / 93-150 uncovered). A perf/refactor pass could silently reintroduce the crashes or break selection.
- **approach:** assert SSR null, `addEventListener` subscribe/teardown **and** the `addListener` fallback path, breakpoint flip; assert the context sync-effect stability; assert picker option-change → variant-resolution → disabled states; add dedicated tests for `chip-class.ts` class derivation, the `more.tsx` overflow control, and the uncovered `overlay.tsx` branches (L28-29 / 93-150).
- **needs-changeset:** no · **needs-regression-test:** n/a (this is the test work)
- **depends on:** P0-1, P0-3

### P0-12 — Make CI `pnpm test` deterministic (kill the V8 coverage `.tmp` flake)
- **file(s):** `apps/storefront/vitest.config.ts` (or root vitest workspace config), `package.json` test scripts
- **impact:** high · **effort:** medium · **risk:** low
- **root cause:** vitest 4.1.7's V8 coverage provider intermittently throws `Something removed the coverage directory "coverage/.tmp"` after all tests pass, flipping the run to exit 1. CI runs `pnpm test` (default `--coverage`), so it flaps red on a green suite — which makes every gate in this rebuild untrustworthy.
- **approach (root cause, not "disable coverage"):** give each project/run a unique `coverage.reportsDirectory` (or `.tmp` dir) so concurrent providers can't delete each other's shards, **or** pin/upgrade vitest past the `.tmp`-cleanup race. Re-run twice to confirm stable exit 0. Also harden `search.regression.test.ts` to resolve the source path from `__dirname` not `process.cwd()` (latent cwd assumption that breaks bare `vitest run`).
- **needs-changeset:** no · **needs-regression-test:** n/a (harness)

### P0-13 — `visualViewport`-based inset handling for the SheetPicker + fixed-bottom action bars
- **file(s):** `apps/storefront/src/components/product-card/picker/sheet.tsx`, any fixed-bottom action bar (cart sidebar checkout bar), new `apps/storefront/src/hooks/useVisualViewportInset.ts`
- **impact:** medium · **effort:** small-medium · **risk:** low
- **root cause:** assess-ios A6 — `layout.tsx:38` sets `interactiveWidget: 'resizes-content'`, which **iOS Safari ignores**. The SheetPicker is the primary mobile add-to-cart surface (B1/C1 route mobile → SheetPicker), and any fixed-bottom element stays keyboard-occluded when the soft keyboard opens. The viewport meta cannot fix this on iOS; only `window.visualViewport` geometry can.
- **approach:** add a small `useVisualViewportInset` hook that subscribes to `visualViewport` `resize`/`scroll` and exposes the bottom inset (offsetTop + height delta), with feature detection (`if (window.visualViewport)`) and SSR-null safety mirroring P0-1's pattern; apply it as `padding-bottom`/`transform` on the SheetPicker action region and any fixed-bottom bar so the CTA rides above the keyboard. Keep the existing `env(safe-area-inset-bottom)` (A3). **Scope note:** if a measurement pass finds no text input ever focuses inside the sheet on the shipped surfaces, A6 may be downgraded — record that explicitly rather than silently skipping; do not leave it unaddressed.
- **needs-changeset:** no · **needs-regression-test:** yes (hook: SSR-null, subscribe/teardown, inset computed from a mocked `visualViewport`)

---

## Phase P1 — Performance quick wins  (6 tasks)  ·  depends on: P0

**Goal:** Land the highest impact-per-effort performance fixes — the per-request edge round-trips and the cache-default inversion — before deeper architecture work. Order P0 first so the test gate is trustworthy while measuring.

### P1-1 — Process-level cache for the middleware hostname → shop lookup
- **file(s):** `apps/storefront/src/middleware/storefront.ts`; optional lean projection helper in `@nordcom/commerce-db`
- **impact:** critical · **effort:** medium · **risk:** medium
- **root cause:** `storefront.ts:81` runs `Shop.findByDomain(hostname, { sensitiveData: true })` (full credential doc) on **every** matched request, then reads only `.domain`; `:258-260` additionally runs a 2nd `findByDomain` + `ShopifyApiClient` + `LocalesApi` (a Shopify Storefront GraphQL round-trip) on cookie-less requests — all on the edge critical path. React `cache()` cannot help (middleware is not RSC).
- **approach:** add a process-level TTL/LRU cache keyed `hostname → { domain, defaultLocale, locales }` (the dev path already caches `findAll` at `:28`). Scope a **lean projection** (existence + locale summary, no credentials) to the **`:81` validation lookup only** — `:81` reads just `.domain`, so credentials are never needed there. **Do NOT strip `sensitiveData` from the `:258` path:** building `ShopifyApiClient` to call `LocalesApi` on a cache miss genuinely requires the credential doc, so a lean projection cannot replace it there. Instead, cache `LocalesApi` per shop with TTL so a cookie-less **cache hit** needs no client/credentials at all; only a cache miss falls back to the full `sensitiveData` lookup to build the client (preserves first-visit locale resolution).
- **tenant-safety (CLAUDE.md "new tenant = row, no redeploy"):** do **not** negatively cache unknown-host lookups — or cap negative TTL to a few seconds — so a tenant added after its hostname was first probed becomes resolvable promptly. Bound the **positive** TTL (short, documented) and add an explicit invalidation hook on shop writes (admin edits to domain/locales), or accept a short bounded TTL with the staleness window documented. Keep tenant resolution explicit.
- **needs-changeset:** no (db projection is ignored) · **needs-regression-test:** yes (cache hit/miss, positive-TTL expiry, unknown-host 404, **newly-added tenant resolvable within the TTL/invalidation bound**, **unknown host not negatively cached past N seconds**, `LocalesApi` cache hit issues no Shopify round-trip)

### P1-2 — Flip the GraphQL default off `cache:'no-store'`
- **file(s):** `apps/storefront/src/utils/abstract-api.ts`
- **impact:** high · **effort:** small · **risk:** medium
- **root cause:** `:119` `cache: fetchPolicy ?? 'no-store'` makes the per-request `fetchOptions` override `HttpLink`'s `next:{revalidate:28800}` (`api/client.ts:32`), so the 8h floor is dead and every Storefront query is uncached at the fetch layer. `'use cache'` masks page renders, but route handlers (sitemaps, robots, favicon/apple-icon) and any non-`use cache` path hit Shopify every request.
- **approach:** default to a cached policy (omit `cache` so the link-level `revalidate` + tags govern) and pass `cache:'no-store'` **explicitly** only for genuinely dynamic queries (cart/customer/checkout). This activates the existing 8h revalidate + tag-based webhook invalidation (`revalidateTag`/`evictApolloClient`) — correctness is preserved by tags. Audit dynamic call sites before flipping.
- **needs-changeset:** no · **needs-regression-test:** yes (cached vs no-store path; cart query stays no-store)

### P1-3 — Stop re-running `ShopifyApiConfig`'s uncached `findByDomain` on every pooled-client call
- **file(s):** `apps/storefront/src/api/shopify.ts`, `apps/storefront/src/api/_apollo-pool.ts`
- **impact:** high · **effort:** small · **risk:** low
- **root cause:** `shopify.ts:108` calls `ShopifyApiConfig({ shop, buyerIp })` — which runs an uncached `Shop.findByDomain(domain, { sensitiveData: true })` (`shopify.ts:37`) + `createStorefrontClient` — **before** the pool lookup, so it executes even on a pool hit. Pooling saves the `InMemoryCache` but not the per-call DB round-trip + Hydrogen client construction.
- **approach:** move config resolution **inside** the pool factory so it runs only on a pool miss, or memoize `ShopifyApiConfig` per shop. Combine with routing the lookup through the cached `_loaders` Shop (P1-4).
- **needs-changeset:** no · **needs-regression-test:** yes (pool hit makes no DB call)

### P1-4 — Route hot callers through the cached `_loaders` Shop + normalize the cache key
- **file(s):** `apps/storefront/src/api/_loaders.ts`, `apps/storefront/src/api/shopify.ts`, metadata callers
- **impact:** high · **effort:** medium · **risk:** medium
- **root cause:** a React-`cache()` Shop loader exists (`_loaders.ts:35`) but 75 files import the raw uncached `Shop`. `_loaders.cache.test.ts:73` documents that `cache()` keys on **argument reference** — passing a fresh `{ sensitiveData: true }` literal each call is a guaranteed miss, and it only dedupes within one RSC render pass.
- **approach:** normalize the options argument (stable reference / domain-only cached resolver) so the `cache()` key actually hits; route the high-traffic callers (`shopify.ts`, metadata builders) through `_loaders`. Keep React out of the `db` package. Full fleet migration is P2-3.
- **needs-changeset:** no · **needs-regression-test:** yes (dedup within a render pass)

### P1-5 — Share one cached `ProductApi`/client between `generateMetadata` and the page render
- **file(s):** `apps/storefront/src/app/[domain]/[locale]/products/[handle]/page.tsx`, `page-dedup.test.ts`
- **impact:** low-medium · **effort:** small · **risk:** low
- **root cause:** `buildMetadata` uses `ShopifyApiClient` (fetch) while `ProductPage` uses `ShopifyApolloApiClient` (Apollo) — the same product is fetched twice via transports that don't share a cache (cross-request masked by `'use cache'`). The `page-dedup.test.ts` for this is currently skipped.
- **approach:** share one cached `ProductApi`/client across metadata + render so the build-time/first-render double fetch collapses. Un-skip and strengthen `page-dedup.test.ts`.
- **needs-changeset:** no · **needs-regression-test:** yes (un-skip dedup test)

### P1-6 — Bulk clear-cart instead of N per-line `removeLine` mutations
- **file(s):** `apps/storefront/src/components/cart/cart-lines.tsx` (`:42-46`); possibly `@nordcom/cart-react` / `@nordcom/cart-core` if no bulk-clear exists
- **impact:** low · **effort:** small · **risk:** low
- **root cause:** assess-functional D7 — clear-cart at `cart-lines.tsx:42-46` loops `removeLine` once per line, firing N mutations (and N optimistic re-renders / N network round-trips) instead of a single bulk clear. Perf/UX wart, not a break.
- **approach:** if `@nordcom/cart-react`/`-core` already exposes a bulk `clearCart`/empty operation, call it from the storefront (no changeset). If it does not, add a bulk-clear to the cart runtime — **this is a `@nordcom/cart-*` runtime change and DOES need a changeset (`patch`)**, the one place in this roadmap that does. If neither is worth the cost, **explicitly mark accepted-as-is** in this task rather than dropping it silently.
- **needs-changeset:** no (storefront-only call) / **yes, `patch`** (if a cart-runtime bulk-clear is added) · **needs-regression-test:** yes (clear empties the cart in one mutation)

---

## Phase P2 — Performance architecture  (5 tasks)  ·  depends on: P1

**Goal:** The structural performance fixes — image optimization, GraphQL query slimming, fleet-wide cached Shop access, and confirming cache boundaries now that the no-store default is gone.

### P2-1 — Enable image optimization + restrict `remotePatterns`
- **file(s):** `apps/storefront/next.config.js`
- **impact:** high · **effort:** medium · **risk:** medium
- **root cause:** `:71` `unoptimized:true` (`// FIXME`) and `:79` `hostname:'*'` (`// FIXME`). Full-size images ship on every render; the wildcard lets Next proxy any https host (abuse/SSRF surface).
- **approach:** enable optimization (`unoptimized:false`) or wire the commented Cloudflare image loader at `:73`; restrict `remotePatterns` to Shopify CDN + known tenant hosts. **Prerequisite subtask:** enumerate every real image host across the multi-tenant fleet (query the `shops` collection) and whitelist them before flipping, to avoid broken renders.
- **needs-changeset:** no · **needs-regression-test:** build/visual smoke (no unit gate)

### P2-2 — Split the monolithic product fragment (lean card vs full PDP)
- **file(s):** `apps/storefront/src/api/shopify/product/queries.ts` (+ call sites); possibly `@nordcom/commerce-shopify-graphql`
- **impact:** high · **effort:** large · **risk:** medium
- **root cause:** one `PRODUCT_FRAGMENT` fetches `options(first:250)`, `variants(first:250)`, `images(first:250)`, 9 metafields, and nested `quantityBreaks references(first:25)` for **every** surface (PDP, lists, collections, search, recommendations). List/card surfaces pay full PDP cost.
- **ORDERING HAZARD — the card fragment is NOT `id/handle/title/image/price/availableForSale`.** The P0 product-card add-to-cart + picker depend on variant/option data on card surfaces: `product-card.tsx:82` returns `null` when `data.variants.edges[0].node` is absent; `:86-89` derive `seedVariant`/`variantCount`/`isSingleBuyable` from `variants`; `ProductCardData` (`:27-30`) Picks `'options' | 'variants'`; and the picker resolves the selected variant from option/variant data. A fragment that drops `variants`/`options` blanks every collection/search/recommendation grid and re-breaks P0-2/3/4/5.
- **approach:** define the lean card fragment as `id, handle, title, vendor, tags, featuredImage, priceRange, availableForSale` **plus a capped `variants(first:n)` and `options`/`optionValues`** — the data the card seed-variant logic and the surface pickers require. Only **metafields, `quantityBreaks references`, `adjacentVariants`, the full `images(first:250)` gallery, and the 250-caps** are safe to drop on card surfaces (cap variants/images to a real page size and paginate). **Keep `variants`/`optionValues`/`adjacentVariants` + metafields on the PDP path** — hydrogen-react `getProductOptions` needs the full set. Migrate call sites surface by surface; any surface that renders a `ProductCard` with a CTA/picker gets the option-bearing lean fragment, not the bare one.
- **needs-changeset:** no (shopify-graphql is ignored even if the fragment moves there) · **needs-regression-test:** yes — **the "card surfaces still render" test must exercise the picker path, not just visual render**: assert that after the fragment split a card on a collection/search surface still resolves a seed variant, opens the picker, and add-to-cart succeeds; and that PDP options stay intact.

### P2-3 — Fleet-wide `_loaders` Shop migration + domain-only resolver + non-RSC TTL cache
- **file(s):** `apps/storefront/src/api/_loaders.ts` + ~75 importers of raw `Shop`
- **impact:** high · **effort:** medium-large · **risk:** medium
- **root cause:** 75 files bypass the cached loader with the raw uncached `Shop` from `@nordcom/commerce-db` (finding 3). `cache()` only helps RSC; middleware/route-handler contexts need a TTL cache.
- **approach:** migrate raw-`Shop` importers to `_loaders`; add a domain-only cached resolver and a TTL cache for non-RSC contexts (shared with P1-1's middleware cache). Keep React out of the db package.
- **needs-changeset:** no · **needs-regression-test:** yes
- **depends on:** P1-4

### P2-4 — Prebuild top-N best-selling PDPs instead of arbitrary first-5
- **file(s):** `apps/storefront/src/app/[domain]/[locale]/products/[handle]/static-params.ts`
- **impact:** low · **effort:** small · **risk:** low
- **root cause:** `:39` `ProductsApi({ api, limit:5 })` warms an arbitrary first-5; under ISR the cap only affects cold-start TTFB but warms the wrong products.
- **approach:** prebuild top-N by best-selling so popular PDPs are warm. Not a correctness fix; optional but cheap.
- **needs-changeset:** no · **needs-regression-test:** no

### P2-5 — Confirm cache boundaries on route handlers post no-store flip
- **file(s):** sitemap/robots/favicon/apple-icon route handlers under `apps/storefront/src/app`
- **impact:** medium · **effort:** small · **risk:** low
- **root cause:** route handlers were the main victims of the no-store default (they have no `'use cache'`). After P1-2 they inherit the link revalidate, but should be verified/tagged.
- **approach:** confirm each route handler now hits cache; add explicit `cacheLife`/tags where a handler needs a different TTL. Don't blanket-cache dynamic handlers.
- **needs-changeset:** no · **needs-regression-test:** no
- **depends on:** P1-2

---

## Phase P3 — Tenant-customization foundation  (6 tasks)  ·  depends on: P0 (P1/P2 parallel-safe)

**Goal:** Make the storefront genuinely themeable beyond two accent colors — a typed per-shop theme schema serialized to CSS variables, plus data-driven section enablement. This is the keystone both tenant-customization and the P5 design polish build on.

### P3-1 — Per-shop theme token schema on the shop record
- **file(s):** `packages/db/src/models/shop.ts` (extend `ShopBase.design` or add a `theme` group); CMS admin fields in `packages/cms`
- **impact:** high · **effort:** medium · **risk:** medium
- **root cause:** `ShopBase.design` carries only `header.logo` + `accents[]`. The full token vocabulary (background/foreground/surfaces, typography, radii, spacing, ~120 product-card knobs) lives in `globals.css :root` — global, identical for every tenant.
- **approach:** add a typed token map to the shop record: colors (incl. background/foreground/surfaces/states), typography (font family/weights/scale), radii, spacing, product-card knobs. Validate with the existing model schema. Tenant context stays explicit. The token **names** already exist — this is schema, not new design.
- **needs-changeset:** no (db is ignored) · **needs-regression-test:** yes (schema validation; backward-compat defaults)

### P3-2 — Serialize theme tokens to CSS variables; kill the hardcoded background/foreground
- **file(s):** `apps/storefront/src/utils/css-variables.tsx`, `apps/storefront/src/app/globals.css`
- **impact:** high · **effort:** medium · **risk:** medium
- **root cause:** `css-variables.tsx:114-115` hardcodes `--color-background:#fefefe` / `--color-foreground:#101418` with a `// TODO`. Only the two accent pairs are dynamic.
- **approach:** emit the P3-1 token map from `CssVariablesProvider`; derive background/foreground per tenant; delete the hardcoded literals and the `globals.css :root` constants that become tenant-owned. Provide platform-default fallbacks so existing shops are unchanged.
- **needs-changeset:** no · **needs-regression-test:** yes
- **depends on:** P3-1

### P3-3 — Semantic token layer in `globals.css` wired to tenant tokens
- **file(s):** `apps/storefront/src/app/globals.css`
- **impact:** critical · **effort:** large · **risk:** medium
- **root cause:** no semantic `--surface-1/2/3`, `--text`, `--text-muted`, `--border-subtle/strong`, `--state-success/danger/sale`, `--focus-ring`, no type scale, no elevation. Two parallel namespaces (`--accent-*` vs `--color-accent-*`) hand-synced; ~30 `LEGACY` product-card tokens.
- **ORDERING HAZARD — do NOT delete the LEGACY product-card tokens here.** They are still consumed past Phase 3: `product-display/primitives/variant-title.tsx:29` reads `--product-card-title-size` (LEGACY at `globals.css:217`), and `variant-price-client.tsx`, `variant-stock-urgency-client.tsx`, `product-options/primitives/{more,overlay}.tsx`, `collection-view-all-tile.tsx` read other LEGACY tokens. Their consumers don't migrate until **P5-6** (type scale) / **P5-8** (token cleanup). Deleting the tokens in P3-3 leaves those primitives reading undefined CSS vars → broken sizing.
- **approach:** **ADD** the semantic token layer (surfaces/text/borders/states/focus/type-scale/elevation) driven from the tenant tokens (P3-2), and collapse the `--accent-*` vs `--color-accent-*` duplication. **Keep all LEGACY product-card tokens defined** — their removal is owned by P5-8, after P5-6 migrates `variant-title.tsx` and its peers off them. This is the shared foundation for P5-1/P5-8 (migrating the ~130 hardcoded utilities).
- **needs-changeset:** no · **needs-regression-test:** yes — add a guard for the visual-only blast radius (see P5-1: a lint/snapshot smoke gate on raw color utilities + a contrast check on the new semantic tokens applies to this layer too).
- **depends on:** P3-2 · **blocks:** P5-1, P5-8

### P3-4 — Lift the product-card token vocabulary into the per-shop theme schema
- **file(s):** `packages/db/src/models/shop.ts`, `apps/storefront/src/utils/css-variables.tsx`, `apps/storefront/src/app/globals.css`
- **impact:** high · **effort:** medium · **risk:** low
- **root cause:** `globals.css:181-304` hardcodes the ~120 product-card knobs (`--product-card-cta-placement`, pill position, quick-add presentation, sale-badge style/position, swatch sizes, radii, motion) globally — exactly the "picker shape" knobs the goal calls for.
- **approach:** move these token names into the P3-1 schema and emit them per shop from `CssVariablesProvider`. Schema + serialization, not new design.
- **needs-changeset:** no · **needs-regression-test:** yes (defaults preserve current look)
- **depends on:** P3-1, P3-2

### P3-5 — Per-tenant typography / fonts
- **file(s):** `apps/storefront/src/utils/fonts.ts`, `packages/db/src/models/shop.ts`
- **impact:** medium · **effort:** small-medium · **risk:** low
- **root cause:** `fonts.ts` hardcodes `Public_Sans` as `--font-primary` for every tenant; no font family/weights/scale on the shop record; no display/heading slot.
- **approach:** add typography tokens to the P3-1 schema; wire the font loader to read them (`next/font` per-request variable; provide a display/heading slot). Keep a platform-default font.
- **needs-changeset:** no · **needs-regression-test:** no
- **depends on:** P3-1

### P3-6 — Data-driven section enablement (toggle sections without a deploy)
- **file(s):** `apps/storefront/src/utils/flags/` (`adapter.ts`, `definitions/`), `packages/cms/src/collections/feature-flags.ts`, `packages/db/src/models/feature-flag.ts`
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** new section toggles require a `defineFlag(...)` code change; the DB only controls the **value** of existing flags. Only 3 flags exist.
- **approach:** resolve generic section-enablement flags from the `feature-flags` collection (or drive slot inclusion directly from CMS — pairs with P4-2), so tenants toggle sections without a code deploy. Keep the Vercel Flags adapter as the evaluation path.
- **needs-changeset:** no · **needs-regression-test:** yes (flag resolution per shop)

---

## Phase P4 — Extensibility  (4 tasks)  ·  depends on: P3

**Goal:** One shared composition registry, CMS-driven slot layout for chrome + templates, a tenant-aware variant registry, and a forward path to manifest-based third-party extensions — layered on the existing Block-loader firewall.

### P4-1 — Unify block dispatch into one shared `type → component` registry
- **file(s):** `packages/cms/src/blocks/render/BlockRenderer.tsx`, `packages/cms/src/blocks/index.ts`, `apps/storefront/src/blocks/`, `apps/storefront/src/components/cms/cms-content.tsx`
- **impact:** high · **effort:** medium · **risk:** medium
- **root cause:** `BlockRenderer.tsx:35-56` switches on `blockType`; the storefront ships a parallel `Blocks` dispatcher. Adding a block means editing the CMS block list + ≥2 renderer switches. No single registry.
- **approach:** one shared registry consumed by both the CMS block defs and the storefront renderer, so a new section/block is a single registration. Replace both switches. Preserve the Block-loader contract (storefront supplies Shopify data at the render boundary; CMS never sees a product).
- **needs-changeset:** no (cms + storefront ignored) · **needs-regression-test:** yes (each existing block still renders)
- **blocks:** P4-2, P4-4

### P4-2 — CMS-driven slot composition for page chrome + template pages
- **file(s):** `apps/storefront/src/components/layout/shop-layout.tsx`, `apps/storefront/src/app/[domain]/[locale]/products/[handle]/layout.tsx`, new layout/template surface in `packages/cms`
- **impact:** high · **effort:** large · **risk:** medium
- **root cause:** `ShopLayout` hardcodes `info-bar → header → content → footer`; the PDP layout fixes `@gallery/@description/@details/@recommendations`; PLP/search/cart/account similarly fixed. Only CMS page **bodies** are composable.
- **approach:** a `layout`/`template` CMS surface per route-type holding an ordered, toggleable section list; render chrome + templates through the shared registry (P4-1) as slot hosts. Tenants reorder/toggle/insert sections without a deploy.
- **needs-changeset:** no · **needs-regression-test:** yes (default composition matches current layout)
- **depends on:** P4-1, P3-6

### P4-3 — Generalize the product-card picker/CTA registries into a tenant-aware variant registry
- **file(s):** `apps/storefront/src/components/product-card/picker/registry.ts`, `.../cta/registry.ts`, `.../presets.ts`
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** the `Map`-based picker/CTA registries are populated only at module load with built-ins; selection is by hardcoded `SURFACE_PRESETS`, never by shop config/CMS; no external registration entrypoint.
- **approach:** generalize into a shared variant registry; expose `register*` as the public extension API. **Keep `SURFACE_PRESETS` as the default fallback layer** — per-shop config/CMS overrides (P3-1/P3-4) **layer on top of** the presets, they do **not** replace them. The resolution order is: shop/CMS override → surface preset → built-in default. A shop with no overrides (the existing/default case for every un-customized tenant) must still resolve exactly the current preset-driven picker/CTA per surface; removing presets as the selection source would re-break the P0 picker for every default tenant. (Also resolves P0-9's `new Error` cleanly if not already done.)
- **needs-changeset:** no · **needs-regression-test:** yes — a shop with **no overrides** still resolves the current preset-driven picker/CTA per surface (inline/float/sheet), plus override-layering precedence.
- **depends on:** P3-1

### P4-4 — Manifest-based per-shop extension model
- **file(s):** new extension-registry module; reuses Block-loader contract (CONTEXT.md)
- **impact:** medium · **effort:** large · **risk:** medium
- **root cause:** no extension manifest, per-shop code/asset loading, or sandbox; `register*` is never called from any extension surface; everything ships in one Next.js deploy.
- **approach:** a manifest by which an extension declares blocks/sections, component variants, theme tokens, and sandboxed block loaders, registered per shop and layered on the Block-loader firewall so extensions never touch tenant credentials. Long-tail goal; foundations P3-1..4 + P4-1..3 are prerequisites.
- **needs-changeset:** no · **needs-regression-test:** yes
- **depends on:** P3-1, P3-2, P3-3, P3-4, P4-1, P4-2, P4-3

---

## Phase P5 — Design polish  (10 tasks)  ·  depends on: P3 (esp. P3-3)

**Goal:** Promote the rest of the UI to the bar the product-card system already sets — token-driven, tenant-themeable, accessible — to reach "impressive."

### P5-1 — Migrate the ~130 hardcoded color utilities onto semantic tokens
- **file(s):** ~31 component files (`bg-gray-100` ×25, `text-gray-500/600`, `border-gray-200`, `text-red-500`, `bg-green-600`, `text-amber-600`, `bg-white`); anchor `apps/storefront/src/components/layout/card.tsx`
- **impact:** high · **effort:** large · **risk:** medium
- **root cause:** only the accent is themeable; the neutral/semantic palette is hardcoded Tailwind defaults, so any tenant gets generic gray chrome regardless of brand.
- **approach:** migrate hardcoded utilities to the P3-3 semantic tokens (surfaces/text/borders/states). Add an elevation/surface hierarchy so the UI is not "gray on gray."
- **guard for the 31-file / ~130-occurrence blast radius:** a broad migration with no automated guard risks silent visual/contrast regressions. Add (a) a **lint/CI check that fails on raw `gray|red|green|amber|white` color utilities** under `apps/storefront/src/components` (a Biome/grep gate that ratchets to zero as files migrate, then stays at zero), and (b) a **contrast check on the new semantic token pairs** — explicitly validate the cases assess-design flagged: `text-gray-500` on `bg-gray-100` (~4.0:1) and the borderline `--product-card-vendor-color` on white. Optionally back it with a snapshot/visual smoke gate. The same gate covers the visual-only P3-3.
- **needs-changeset:** no · **needs-regression-test:** yes (raw-utility lint gate ratcheting to zero + token contrast check)
- **depends on:** P3-3

### P5-2 — Redesign empty-cart + empty-collection/search + 404 + error states
- **file(s):** `apps/storefront/src/components/cart/cart-empty.tsx` (from P0-8), `apps/storefront/src/app/[domain]/[locale]/error.tsx`, `not-found.tsx`; collection/search grid surfaces (collection page + `search/` results) + a shared `EmptyState` component
- **impact:** high · **effort:** medium · **risk:** low
- **root cause:** 404/error are plain hardcoded-English headings; the empty cart (now i18n'd in P0-8) still needs an illustration + CTAs; and per assess-design §8 a **collection/search with zero products renders nothing in the grid area** — no friendly empty state at all. These are the conversion funnel and brand moments.
- **approach:** token-tinted illustrations/icons, i18n copy, CTAs (continue shopping, featured collection, search box, suggested products). Build on P0-8's empty-cart component. **Add the zero-result collection/search empty state**: token-tinted illustration/icon, i18n copy, and a CTA (browse all / featured collection / clear filters) so an empty grid is a branded state, not a blank region. Factor a shared `EmptyState` primitive reused across cart/collection/search/404.
- **needs-changeset:** no · **needs-regression-test:** no
- **depends on:** P0-8, P3-3

### P5-3 — Homepage loading skeleton
- **file(s):** `apps/storefront/src/app/[domain]/[locale]/loading.tsx`
- **impact:** medium-high · **effort:** small · **risk:** low
- **root cause:** `loading.tsx` renders an empty `PageContent` — a blank frame on navigation to home.
- **approach:** hero + rail skeleton mirroring the home composition (CLS-safe, like `BannerBlock.Skeleton`).
- **needs-changeset:** no · **needs-regression-test:** no

### P5-4 — Tokenized Button variant system
- **file(s):** `apps/storefront/src/components/actionable/button.tsx` + hand-rolled-button consumers
- **impact:** high · **effort:** medium · **risk:** low
- **root cause:** one primary variant; consumers `styled={false}` and hand-roll (banner CTA, cart clear/remove). **Bug:** base class `transition-color` is invalid (should be `transition-colors`) — line 38; the unstyled path transitions nothing.
- **approach:** one tokenized component with primary/secondary/outline/ghost/destructive + sizes; fix the `transition-color` typo; retire hand-rolled buttons.
- **needs-changeset:** no · **needs-regression-test:** no
- **depends on:** P3-3

### P5-5 — Unified focus ring + global reduced-motion + re-enable Biome a11y
- **file(s):** `apps/storefront/biome.json`, `apps/storefront/src/components/header/header.tsx` (`:60`), `apps/storefront/src/components/.../quantity-selector.tsx` (`:176`), `apps/storefront/src/app/globals.css`
- **impact:** high · **effort:** small-medium · **risk:** low
- **root cause:** Biome a11y disabled (regressions ship freely); two `focus-visible::` **double-colon** typos silently disable focus on the header logo + quantity selector; skeleton shimmer animates regardless of `prefers-reduced-motion`. Per assess-design §6, icon-only controls (header search, share buttons) lean on `title` rather than `aria-label`/visually-hidden text, and `sr-only` appears in only 1 file.
- **approach:** fix the two double-colon typos; add a single `--focus-ring` token/utility; gate shimmer + all animations under `motion-safe`; re-enable the Biome a11y rules and fix the fallout. **Beyond what the lint gate catches**, audit icon-only controls and add `aria-label` (or `sr-only` visually-hidden text) — Biome `useButtonType`/`useAltText`-style rules will not flag a `title`-only icon button, so this needs an explicit pass over header search, share, and quantity controls. Re-enabling the gate prevents future regressions across the whole rebuild.
- **needs-changeset:** no · **needs-regression-test:** lint gate (a11y) is the test; plus an assertion that icon-only controls expose an accessible name

### P5-6 — Typography scale tokens + tenant heading-font slot
- **file(s):** `apps/storefront/src/app/globals.css`, components using ad-hoc `text-*` sizes
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** no semantic type scale; sizes are ad-hoc Tailwind utilities; product-card title still on a `LEGACY` px token; no display/heading font pairing.
- **approach:** define `--text-display/h1/h2/body/...` (optionally fluid `clamp()`), migrate ad-hoc sizes, wire the tenant heading-font slot from P3-5; tie `@tailwindcss/typography` prose colors/links to tenant tokens.
- **needs-changeset:** no · **needs-regression-test:** no
- **depends on:** P3-3, P3-5

### P5-7 — Imagery upgrade (LQIP/blur-up, aspect ratios, PDP zoom)
- **file(s):** `apps/storefront/src/components/.../product-gallery.tsx`, `next/image` usages
- **impact:** medium-high · **effort:** medium · **risk:** low
- **root cause:** no `placeholder="blur"`/LQIP anywhere; inconsistent `object-fit`; PDP gallery has no zoom/lightbox and renders product imagery small inside heavy padding; manual `setTimeout(250ms)` crossfade feels sluggish.
- **approach:** add blur-up placeholders, consistent aspect ratios, PDP pinch-zoom/lightbox, larger imagery; replace the manual timeout crossfade. Requires optimization enabled (P2-1) for real LQIP.
- **needs-changeset:** no · **needs-regression-test:** no
- **depends on:** P2-1

### P5-8 — Token-driven, reduced-motion-gated skeleton aesthetic + token cleanup
- **file(s):** `apps/storefront/src/app/globals.css` (skeleton shimmer, remaining `LEGACY`/duplicate tokens)
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** skeleton shimmer is hardcoded `rgba(0,0,0,0.2)` black-alpha at `5s` (slow), off-brand, not tenant-themeable; residual `--accent-*`/`--color-accent-*` duplication + `LEGACY` tokens not fully removed.
- **approach:** drive skeleton color/speed from tenant tokens, gate under `motion-safe`; finish collapsing the duplicate namespaces. **This task — not P3-3 — owns the `LEGACY` product-card token deletion**, and it must run only after **P5-6** has migrated the last consumers (`variant-title.tsx:29` and peers) off the LEGACY type/size tokens. Before deleting, grep `text-(length:--product-card-*)` / `font-(--product-card-*)` / `--product-card-*` across `apps/storefront/src/components` and confirm zero remaining references, so no primitive is left reading an undefined CSS var.
- **needs-changeset:** no · **needs-regression-test:** yes (the same raw-utility/contrast gate from P5-1; plus a check that no `--product-card-*` LEGACY token is referenced after deletion)
- **depends on:** P3-3, P5-6

### P5-9 — Migrate raw spacing utilities onto the spacer/padding tokens
- **file(s):** components using ad-hoc `gap-3`/`gap-4`/`p-3`/`pt-1`/`mb-4` across `apps/storefront/src/components`; anchor on the cart-summary pattern that already uses `var(--block-*)`
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** assess-design §3 — spacing primitives exist (`--block-spacer*`, `--block-padding*`) but most components use raw Tailwind spacing utilities, so spacing rhythm is **not actually centralized/themeable**. P3-1 only adds spacing tokens to the schema; nothing migrates the consumers.
- **approach:** mirror P5-1's color migration for spacing — move ad-hoc `gap-*/p-*/m-*` to the `--block-spacer*`/`--block-padding*` tokens (now tenant-driven via P3-1/P3-4) so spacing is genuinely token-driven. Use the same ratcheting lint/grep gate approach as P5-1 to drive raw-spacing usage toward zero on migrated surfaces.
- **needs-changeset:** no · **needs-regression-test:** no (visual; covered by the P5-1-style gate)
- **depends on:** P3-1, P3-4

### P5-10 — Micro-interaction polish + inline/expandable header search
- **file(s):** `apps/storefront/src/components/product-card/**` + PDP add-to-cart (success flourish), header cart-count badge, `quantity-selector.tsx` (stepper feedback), `apps/storefront/src/components/header/header.tsx` (search)
- **impact:** medium · **effort:** medium · **risk:** low
- **root cause:** assess-design §5/§10 — no add-to-cart success animation, no cart-count bump, no quantity-stepper feedback beyond color; header search is icon-only linking to `/search/` with no inline/expandable field even on desktop. These are the "impressive" polish items the goal calls for.
- **approach (explicitly IN SCOPE — the goal is "impressive"):** add a tokenized, `motion-safe`-gated add-to-cart success flourish + cart-count bump (reusing the product-card motion tokens), give the quantity stepper a tactile feedback state, and add an inline/expandable desktop search field that progressively enhances the existing `/search/` link (icon-only remains the no-JS/mobile fallback). All animations gated under `motion-safe` per P5-5.
- **needs-changeset:** no · **needs-regression-test:** no (visual)
- **depends on:** P3-3, P5-4, P5-5

---

## Cross-phase dependency map

- **P0 → everything** (trustworthy gate + no live crashes before refactors). P0-12 specifically makes the CI gate believable for all later phases.
- **P0-3 → P0-4, P0-5** (shared helper is the home for analytics + error handling).
- **P0-1, P0-3 → P0-11** (tests assert the fixes).
- **P1-4 → P1-3, P2-3** (cached Shop access path).
- **P1-2 → P2-5** (route-handler caching only matters after the no-store flip).
- **P2-1 → P5-7** (real LQIP needs image optimization on).
- **P3-1 → P3-2, P3-4, P3-5, P4-3** (theme schema is the source of truth).
- **P3-2 → P3-3, P3-4.**
- **P3-3 → P5-1, P5-4, P5-6, P5-8, P5-10** (semantic tokens gate the design migration). P3-3 only ADDS the semantic layer and collapses `--accent-*` duplication; it does **NOT** delete LEGACY tokens.
- **P5-6 → P5-8** (LEGACY product-card type/size tokens may only be deleted in P5-8 *after* P5-6 migrates their last consumers, e.g. `variant-title.tsx:29` — otherwise primitives read undefined CSS vars).
- **P3-1, P3-4 → P5-9** (spacing tokens must exist + be tenant-emitted before the spacing-utility migration).
- **P5-4, P5-5 → P5-10** (Button variants + motion-safe gating precede the micro-interaction polish).
- **P3-6 → P4-2** (data-driven section enablement feeds slot composition).
- **P4-1 → P4-2, P4-4** (shared registry is the composition primitive).
- **P3-1..4 + P4-1..3 → P4-4** (third-party extensions are last).
- **P0-8 → P5-2** (functional empty-cart before visual polish).
- **P0-13** is self-contained (iOS `visualViewport` inset handling) — no downstream dependents; do it inside P0 alongside the other crash/UX fixes.

## Changeset summary

Per `.changeset/config.json` (`ignore: ["@nordcom/*", "!@nordcom/cart-*"]`), **no task in this roadmap requires a changeset unless it makes a runtime change to a `@nordcom/cart-*` package.** Two tasks could, and only if they take their cart-runtime branch:
- **P0-2 alternative** — adding `useMaybeCartActions` to `@nordcom/cart-react` (the recommended ErrorBoundary path avoids it).
- **P1-6** — adding a bulk `clearCart` to `@nordcom/cart-react`/`-core` if none exists (`patch`); the storefront-only path (calling an existing bulk op) avoids it.

`@nordcom/commerce-db`, `@nordcom/commerce-cms`, `@nordcom/commerce-shopify-graphql`, and `@nordcom/commerce-errors` are all ignored, so the db schema (P3-1), block registry (P4-1), fragment relocation (P2-2), and error class (P0-9) need no changeset.
