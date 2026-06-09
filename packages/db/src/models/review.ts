import type { BaseDocument } from '../db';

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
export type ReviewBase = BaseDocument & {
    shop: string;
};
