/**
 * SFREAD-13 — the per-build Convex call budget for the static-params warmers and the
 * sitemap/robots routes.
 *
 * Build-time Convex cost must scale with the TENANT count, never with catalog/content size:
 * every enumeration that feeds `generateStaticParams` or a sitemap is a single batched read
 * (`Shop.findAll` for the tenant list, one windowed `PagesApi`/`cms/read:pages` call for CMS
 * slugs) or a Shopify-side read that bills nothing against Convex (product/collection/article
 * handles). The long tail of params ships via ISR — no route disables Next's default
 * `dynamicParams = true`, so anything outside the warm set renders on first request instead of
 * inflating the build burst.
 *
 * Worst-case call accounting per build-plus-first-crawl cycle, with zero credit for the
 * render-pass `cache()` dedup in `api/_shop-loader` (build workers may not share it):
 *
 * - platform: 1 × `Shop.findAll` (the root static-params batch; no per-shop re-fetch).
 * - per tenant, static params (the root warmer emits ONE build locale per tenant):
 *   4 × `Shop.findByDomain` (products, collections, custom pages, blogs) + 1 per blog
 *   (article warmer) + 1 CMS pages read (`[...slug]`).
 * - per tenant, sitemaps/robots (first render after a deploy or tag sweep): 3 ×
 *   `Shop.findByDomain` (sitemap index, robots, pages.xml) + 3 per RUNTIME locale
 *   (products/collections/blogs sitemaps) + 1 CMS pages read (pages.xml — one batched
 *   call and at most ONE dual-read shadow for the whole document list, never per entry).
 *
 * Total: `calls(build) <= 1 + N * (9 + B + 3L)` for `N` tenants, `B` blogs/tenant, `L`
 * runtime locales/tenant. Against SPIKE-01's 50k calls/tenant/day ceiling this is noise:
 * at B=3, L=5 a build costs 27 calls/tenant; five builds/day stay under 140 calls/tenant/day.
 * The counting suite (`app/[domain]/build-call-budget.test.ts`) drives a full synthetic build
 * cycle against this formula and proves catalog-size independence; CUTOVER-01's
 * cutover-budgets.md cites the same numbers.
 */

/** Inputs to the per-build call ceiling — the fan-out axes the build actually scales on. */
export type BuildBudgetInputs = {
    /** Number of live (non-demo) tenants enumerated by the root static-params batch. */
    tenants: number;
    /** Worst-case blogs per tenant (drives the article static-params warmer). */
    blogsPerTenant: number;
    /** Worst-case RUNTIME locales per tenant (drives the per-locale sitemap routes). */
    localesPerTenant: number;
};

/** Platform-wide calls per build: the single `Shop.findAll` tenant enumeration. */
export const BUILD_PLATFORM_CALLS = 1;

/** `Shop.findByDomain` calls per tenant across the four per-tenant static-params warmers. */
export const STATIC_PARAMS_LOOKUPS_PER_TENANT = 4;

/** Additional `Shop.findByDomain` per blog for the article static-params warmer. */
export const STATIC_PARAMS_LOOKUPS_PER_BLOG = 1;

/** Batched CMS reads per tenant at build time: the `[...slug]` warmer's single `PagesApi` window. */
export const STATIC_PARAMS_CMS_READS_PER_TENANT = 1;

/** `Shop.findByDomain` calls per tenant for the locale-less SEO routes (index, robots, pages.xml). */
export const SITEMAP_LOOKUPS_PER_TENANT = 3;

/** `Shop.findByDomain` calls per runtime locale (products/collections/blogs sitemaps). */
export const SITEMAP_LOOKUPS_PER_LOCALE = 3;

/** Batched CMS reads per tenant for sitemaps: pages.xml's single `PagesApi` window. */
export const SITEMAP_CMS_READS_PER_TENANT = 1;

/**
 * The hard per-build Convex call ceiling: `1 + N * (9 + B + 3L)`.
 *
 * Deliberately independent of catalog size — products, collections, articles, and CMS pages
 * may grow without moving this number, because every per-entity enumeration is either batched
 * into one Convex call or served by Shopify.
 *
 * @param inputs - The tenant/blog/locale fan-out the build enumerates.
 * @returns The maximum number of Convex-billed calls one build-plus-first-crawl cycle may issue.
 */
export function maxConvexCallsPerBuild({ tenants, blogsPerTenant, localesPerTenant }: BuildBudgetInputs): number {
    const staticParams =
        STATIC_PARAMS_LOOKUPS_PER_TENANT +
        STATIC_PARAMS_CMS_READS_PER_TENANT +
        blogsPerTenant * STATIC_PARAMS_LOOKUPS_PER_BLOG;
    const sitemaps =
        SITEMAP_LOOKUPS_PER_TENANT + SITEMAP_CMS_READS_PER_TENANT + localesPerTenant * SITEMAP_LOOKUPS_PER_LOCALE;
    return BUILD_PLATFORM_CALLS + tenants * (staticParams + sitemaps);
}
