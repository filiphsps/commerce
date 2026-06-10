# Cutover budgets

Numeric go/no-go budgets for the Mongo→Convex cutover. CUTOVER-01 owns the full
go/no-go table; sections below were contributed by the tasks that proved them.

## Build-time fan-out budget (SFREAD-13)

**Hard per-build Convex call cap:**

```
calls(build + first crawl) <= 1 + N * (9 + B + 3L)
```

where `N` = live (non-demo) tenants, `B` = blogs/tenant, `L` = runtime
locales/tenant. The formula and its per-term constants live in
`apps/storefront/src/utils/build-budget.ts`
(`maxConvexCallsPerBuild`); the counting suite
`apps/storefront/src/app/[domain]/build-call-budget.test.ts` drives a full
synthetic build-plus-first-crawl cycle (root static-params batch → every nested
static-params warmer → first render of all sitemap/robots routes) and asserts
the count lands exactly on the formula and is **independent of catalog size**
(`M` products/collections/pages/articles never multiply Convex calls).

Per-term accounting (worst case, zero credit for render-pass `cache()` dedup):

| Surface | Convex calls |
| --- | --- |
| Root `[domain]/[locale]` static-params | 1 × `Shop.findAll` platform-wide (the per-shop `findByDomain` N+1 was removed) |
| Nested static-params per tenant (1 build locale) | 4 × `findByDomain` (products, collections, `[...slug]`, blogs) + `B` × `findByDomain` (articles) + 1 × CMS pages window |
| Sitemaps/robots per tenant (first crawl) | 3 × `findByDomain` (sitemap index, robots.txt, pages.xml) + 3`L` × `findByDomain` (products/collections/blogs sitemaps) + 1 × CMS pages window (pages.xml) |

**Against SPIKE-01's ≤ 50k calls/tenant/day ceiling:** at `B = 3`, `L = 5` a
build costs 27 calls/tenant; at the assumed ≤ 5 builds/day that is ≤ 135
calls/tenant/day from build fan-out — under 0.3% of the ceiling, leaving the
budget dominated by the request-path terms SPIKE-01 already models.

**Long tail = ISR, not build enumeration:** the products warmer pre-renders only
`PREBUILT_PRODUCT_COUNT = 10` handles per tenant; no route segment under
`apps/storefront/src/app` sets `dynamicParams` (Next.js default `true` —
pinned by the `long-tail ISR posture` test in the counting suite), so any param
outside the warm set renders on first request instead of inflating the build.

**Shadow batching:** the SFREAD-12 dual-read shadow fires per **getter call**,
not per entry. A 1000-page pages.xml render or `[...slug]` warm-up is one
`PagesApi` window → at most ONE `cms/read:pages` shadow comparison, deferred via
`after()` off the render path (pinned by the `PagesApi shadow batching` test in
`apps/storefront/src/api/page.test.ts`). Shopify-backed enumerations
(products/collections/blogs/articles) bill nothing against Convex.
