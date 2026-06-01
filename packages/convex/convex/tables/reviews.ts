import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Stored row shape for a shop review, mirroring `ReviewBase` from `@nordcom/commerce-db`'s
 * `review.ts` (post-UNIFY-06 id-ref shape): a review relates to its shop by the unified shop row id,
 * with NO embedded shop snapshot. An id carries no masked/secret shop fields, so the public review
 * shape can never leak shop credentials; callers needing shop fields resolve the shop by this id.
 *
 * `shopId` is now a resolved `v.id('shops')`: CONVEXCORE-04 has landed the `shops` table in this same
 * schema, so the former forward-reference `v.string()` is promoted to a real branded reference (the
 * migration remaps each legacy Mongo shop id to its `shops` row id). This is the reference shape
 * CONVEXCORE-05 specifies for `reviews`.
 *
 * `createdAt`/`updatedAt` are explicit numeric (epoch-ms) fields preserving the Mongo `timestamps`
 * pair, since Convex's `_creationTime` reflects the migration insert, not the original creation.
 */
export const reviewValidator = v.object({
    shopId: v.id('shops'),
    createdAt: v.number(),
    updatedAt: v.number(),
});

/**
 * Inferred row shape for a shop review, shape-compatible with the migration's `ReviewBase` id-ref.
 * See {@link reviewValidator}.
 */
export type ReviewBase = Infer<typeof reviewValidator>;

/**
 * Review table. `by_shop` scans every review for a shop by its `v.id('shops')` reference (see
 * {@link reviewValidator}). The index keys on the single `shopId` foreign key, so the plain `by_shop`
 * name fits the multi-tenant convention without a trailing field.
 */
const reviewsTable = defineTable(reviewValidator).index('by_shop', ['shopId']);

/**
 * The reviews table group. Spread into `coreTables` via `tables/index.ts`, then into `defineSchema`.
 */
export const reviewsTables = {
    reviews: reviewsTable,
};
