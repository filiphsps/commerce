import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Divergence ledger for the SFREAD-12 CMS dual-read shadow: while the storefront getters serve
 * Payload-on-Mongo (the authoritative backend during the bake), each getter also reads the Convex
 * shadow and records every normalized mismatch — or shadow-side error — as one row here. A Convex
 * table (rather than a structured log line) was chosen deliberately so the bake report is a plain
 * Convex query over `by_getter`/`by_shop` instead of a log-scraping exercise, and so the ledger
 * survives storefront redeploys.
 *
 * Written ONLY through the server-trust tier (`cms/read.ts`'s `recordDivergence` serverMutation —
 * the storefront getter path is identity-less), and keyed on the PUBLIC string shop id the
 * storefront holds (the migrated Mongo id), mirroring the revalidation bridge's string tenant key
 * rather than a `v.id('shops')` foreign key. At the tenant tier the table stays under
 * `lib/rls.ts`'s deny-everything base rule.
 */
export const cmsReadShadowTables = {
    cmsReadDivergence: defineTable(
        v.object({
            /** PUBLIC shop id string (the migrated Mongo id the storefront's `shop.id` carries). */
            shop: v.string(),
            /** Storefront getter surface that diverged (`header`, `page`, `articles`, …). */
            getter: v.string(),
            /** `mismatch` = normalized payloads differ; `error` = the Convex shadow read failed. */
            kind: v.union(v.literal('mismatch'), v.literal('error')),
            /** BCP-47 request locale the getters were invoked with. */
            locale: v.string(),
            /** Natural key for keyed getters (page/article slug, product/collection handle). */
            key: v.optional(v.string()),
            /** Bounded human-readable summary: first differing path, or the shadow error message. */
            detail: v.optional(v.string()),
            createdAt: v.number(),
        }),
    )
        .index('by_shop', ['shop'])
        .index('by_getter', ['getter']),
};
