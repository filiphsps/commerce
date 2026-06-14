/** Shopify's Storefront API caps a connection's `first` argument at 250. */
const SHOPIFY_MAX_PAGE_SIZE = 250;

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
