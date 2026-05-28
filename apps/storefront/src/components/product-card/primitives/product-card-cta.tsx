'use client';

import type { ProductSnapshot } from '@nordcom/cart-core';
import { useCartActions } from '@nordcom/cart-react';
import { useCallback } from 'react';
import { getProductCardCta } from '@/components/product-card/cta';
import { usePickerOpen, useVariantSelection } from './product-card-options-provider';

export type ProductCardCtaProps = {
    placement: string;
};

/**
 * Client component that reads variant-selection context and renders the registered CTA for the given placement.
 * For single-variant products, wires `onAdd` directly to the cart `addLine` action.
 * For multi-variant products, `onAdd` opens the picker instead.
 *
 * @param props.placement - Registry key identifying which CTA component to render.
 * @returns The resolved CTA element, or `null` when context is unavailable.
 */
const ProductCardCta = ({ placement }: ProductCardCtaProps) => {
    const sel = useVariantSelection();
    const picker = usePickerOpen();
    const { addLine } = useCartActions();

    const onAdd = useCallback(async () => {
        if (!sel || !picker) return;

        if (picker.isSingleBuyable) {
            const variant = sel.product.variants?.edges?.find((e) => e.node.id === sel.selectedVariantId)?.node;
            if (!variant) return;

            const snapshot: ProductSnapshot = {
                variantId: sel.selectedVariantId,
                productHandle: sel.product.handle ?? '',
                productTitle: sel.product.title ?? '',
                variantTitle: variant.title ?? '',
                image: variant.image
                    ? {
                          url: variant.image.url ?? '',
                          altText: variant.image.altText ?? null,
                          width: variant.image.width ?? 0,
                          height: variant.image.height ?? 0,
                      }
                    : null,
                unitPrice: {
                    amount: variant.price.amount ?? '0',
                    currencyCode: variant.price.currencyCode ?? 'USD',
                },
                compareAtUnitPrice: variant.compareAtPrice
                    ? {
                          amount: variant.compareAtPrice.amount ?? '0',
                          currencyCode: variant.compareAtPrice.currencyCode ?? 'USD',
                      }
                    : null,
            };

            await addLine({ variantId: sel.selectedVariantId, quantity: 1, snapshot });
        } else {
            picker.setOpen(true);
        }
    }, [sel, picker, addLine]);

    if (!sel || !picker) return null;

    const Cta = getProductCardCta(placement);

    return (
        <Cta
            productHandle={sel.product.handle}
            seedVariantId={sel.selectedVariantId}
            isSingleBuyable={picker.isSingleBuyable}
            isOpen={picker.open}
            onActivate={() => picker.setOpen(!picker.open)}
            onAdd={onAdd}
        />
    );
};

ProductCardCta.displayName = 'Nordcom.ProductCard.Cta';

export default ProductCardCta;
