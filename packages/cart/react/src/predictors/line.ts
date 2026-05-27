import type { CartLine, CartLineMerchandise } from '@nordcom/cart-core';
import type { LinePredictor } from '../types';

/**
 * Build a line predictor that derives a predicted cart line directly from the
 * inline `snapshot` payload carried on an add-line mutation. Lets callers ship
 * known merchandise data with the mutation so the optimistic UI doesn't depend
 * on a separate cache lookup.
 *
 * @returns A {@link LinePredictor} that yields `Partial<CartLine>` for
 *   `add-line` mutations carrying a `snapshot`, and `null` otherwise.
 */
export function snapshotPredictor(): LinePredictor {
    return (mutation, ctx) => {
        if (mutation.kind !== 'add-line' || !mutation.snapshot) return null;
        const s = mutation.snapshot;
        const currency = ctx.projection.cost.subtotal.currencyCode;
        return {
            quantity: mutation.quantity,
            merchandise: {
                id: s.variantId,
                productId: '',
                productHandle: s.productHandle,
                productTitle: s.productTitle,
                productVendor: null,
                productType: null,
                variantTitle: s.variantTitle,
                image: s.image,
                selectedOptions: [],
                unitPrice: s.unitPrice,
                compareAtUnitPrice: s.compareAtUnitPrice ?? null,
                availableForSale: true,
                quantityAvailable: null,
                sku: null,
            } satisfies CartLineMerchandise,
            cost: {
                subtotal: { amount: '0', currencyCode: currency },
                total: { amount: '0', currencyCode: currency },
            },
            attributes: mutation.attributes ?? [],
            discountAllocations: [],
        } as Partial<CartLine>;
    };
}

/**
 * Build a line predictor that looks merchandise up via a host-supplied KV
 * getter (e.g., a product cache keyed by variant id). The returned partial
 * merchandise is merged onto a minimal placeholder so the cache only needs to
 * provide the fields it actually knows.
 *
 * @param opts.get - Synchronous lookup returning partial merchandise or
 *   `null` on cache miss. The getter must be pure with respect to render to
 *   keep predictions stable across re-renders.
 * @returns A {@link LinePredictor} that yields `Partial<CartLine>` on cache
 *   hit and `null` on miss or for non-`add-line` mutations.
 */
export function cachePredictor(opts: {
    get: (variantId: string) => Partial<CartLineMerchandise> | null;
}): LinePredictor {
    return (mutation, ctx) => {
        if (mutation.kind !== 'add-line') return null;
        const m = opts.get(mutation.variantId);
        if (!m) return null;
        const currency = ctx.projection.cost.subtotal.currencyCode;
        return {
            quantity: mutation.quantity,
            merchandise: {
                id: mutation.variantId,
                productId: '',
                productHandle: '',
                productTitle: '',
                productVendor: null,
                productType: null,
                variantTitle: '',
                image: null,
                selectedOptions: [],
                unitPrice: { amount: '0', currencyCode: currency },
                compareAtUnitPrice: null,
                availableForSale: true,
                quantityAvailable: null,
                sku: null,
                ...m,
            } as CartLineMerchandise,
            cost: {
                subtotal: { amount: '0', currencyCode: currency },
                total: { amount: '0', currencyCode: currency },
            },
            attributes: mutation.attributes ?? [],
            discountAllocations: [],
        } as Partial<CartLine>;
    };
}
