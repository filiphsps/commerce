import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';

export const ReviewSchema = new Schema(
    {
        // Phase-0 unification: a review relates to its shop by the unified shop
        // row id, not an embedded shop snapshot. After the shop==tenant
        // collapse a shop and its tenant share one row, so a single id ref
        // is sufficient — and an id carries no masked/secret shop fields, so
        // the public review shape can never leak shop credentials.
        shop: {
            type: String,
            required: true,
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

/**
 * Document shape for a shop review. `shop` is the unified shop row id (a string ref), not an
 * embedded shop document — reviews relate to shops by id, consistent with the shop==tenant
 * collapse. Callers that need shop fields resolve the shop by this id rather than reading them
 * off the review.
 *
 * @example
 * ```ts
 * import type { ReviewBase } from '@nordcom/commerce-db';
 * function reviewShopId(review: ReviewBase): string {
 *     return review.shop;
 * }
 * ```
 */
export type ReviewBase = BaseDocument & InferSchemaType<typeof ReviewSchema>;

export const ReviewModel = (db.models.Review || db.model('Review', ReviewSchema)) as ReturnType<
    typeof db.model<typeof ReviewSchema>
>;
