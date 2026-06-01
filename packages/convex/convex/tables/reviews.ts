import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Stored row shape for a shop review, mirroring `ReviewBase` from `@nordcom/commerce-db`'s
 * `review.ts` (post-UNIFY-06 id-ref shape): a review relates to its shop by the unified shop row id,
 * with NO embedded shop snapshot. An id carries no masked/secret shop fields, so the public review
 * shape can never leak shop credentials; callers needing shop fields resolve the shop by this id.
 *
 * `shopId` is `v.string()` rather than `v.id('shops')` as a deliberate FORWARD-REFERENCE: the `shops`
 * table is added by CONVEXCORE-04 (a later, gated wave) and does not yet exist, so `v.id('shops')`
 * cannot resolve and would fail codegen/typecheck. Promote `shopId` to `v.id('shops')` once that
 * table lands; the migrated value (a Mongo shop row id string) is id-compatible either way.
 *
 * `createdAt`/`updatedAt` are explicit numeric (epoch-ms) fields preserving the Mongo `timestamps`
 * pair, since Convex's `_creationTime` reflects the migration insert, not the original creation.
 */
export const reviewValidator = v.object({
    shopId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

/**
 * Inferred row shape for a shop review, shape-compatible with the migration's `ReviewBase` id-ref.
 * See {@link reviewValidator}.
 */
export type ReviewBase = Infer<typeof reviewValidator>;

/**
 * Review table. `by_shop` scans every review for a shop by its id ref. Reviews are conceptually
 * tenant-scoped, but the shop reference is a forward-referenced `v.string()` (see
 * {@link reviewValidator}) rather than a resolved `v.id('shops')`, so this uses the plain `by_shop`
 * scan name; it adopts the `by_shop_<field>` convention once `shopId` becomes a real id reference.
 */
const reviewsTable = defineTable(reviewValidator).index('by_shop', ['shopId']);

/**
 * The reviews table group. Spread into `coreTables` via `tables/index.ts`, then into `defineSchema`.
 */
export const reviewsTables = {
    reviews: reviewsTable,
};
