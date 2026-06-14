import type { OnlineShop } from '@nordcom/commerce-db';

/** Shopify's Storefront API caps a connection's `first` argument at 250. */
const SHOPIFY_MAX_PAGE_SIZE = 250;

/** Default collection page size when a shop sets no `commerce.productsPerPage` override. */
export const COLLECTION_PRODUCTS_PER_PAGE = 21 as const;

/**
 * Clamps a configured catalog page size to the range Shopify's Storefront API
 * accepts and coerces it to a whole number, so a per-shop `productsPerPage`
 * override can never request `first` outside `[1, 250]` or a fractional count.
 *
 * Non-finite or sub-1 inputs floor to 1 — the page must hold at least one
 * product — and values above 250 saturate at 250.
 *
 * @param size - The requested page size (e.g. `shop.commerce?.productsPerPage`).
 * @returns An integer page size within `[1, 250]`.
 */
export function clampPageSize(size: number): number {
    if (!Number.isFinite(size)) {
        return 1;
    }

    return Math.min(SHOPIFY_MAX_PAGE_SIZE, Math.max(1, Math.floor(size)));
}

/**
 * Resolves the effective collection page size for a shop: the per-shop `commerce.productsPerPage`
 * override clamped to Shopify's bounds, or {@link COLLECTION_PRODUCTS_PER_PAGE} when unset. The
 * collection count precompute and the content fetch MUST call this with the same shop so their
 * `first` arguments agree — a mismatch breaks the cursor math.
 *
 * @param shop - The tenant shop carrying the optional `commerce.productsPerPage`.
 * @returns The page size to pass as the Shopify connection `first` argument.
 */
export function collectionPageSize(shop: OnlineShop): number {
    return clampPageSize(shop.commerce?.productsPerPage ?? COLLECTION_PRODUCTS_PER_PAGE);
}
