'use client';

import type { ProductSnapshot } from '@nordcom/cart-core';
import { useCartActions } from '@nordcom/cart-react';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Product } from '@/api/product';
import { useShop } from '@/components/shop/provider';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import { useTrackable } from '@/utils/trackable';

/**
 * Outcome of a product-card add attempt. `ok` is `false` when the requested variant
 * could not be resolved or the cart mutation failed, letting callers (the picker)
 * keep their open state instead of dismissing on a failed add.
 */
export type AddProductCardLineResult = { ok: boolean };

/**
 * Single home for the product-card add-to-cart flow shared by the CTA fast path
 * (single-variant) and the picker path (chosen variant). Builds the cart-line
 * {@link ProductSnapshot}, dispatches `addLine`, surfaces failures via toast, and
 * emits the GA4 `add_to_cart` event on success.
 *
 * Centralizing the flow here removes the verbatim snapshot/`addLine` duplication
 * the two primitives carried, and fixes two divergences from the PDP add button:
 * card adds previously emitted nothing to analytics and silently dropped failures.
 *
 * @param product - Card product whose variant edges supply snapshot and pricing data; `undefined` while the selection context is absent.
 * @returns A callback that adds one unit of the given variant and resolves to its {@link AddProductCardLineResult}.
 */
export function useAddProductCardLine(
    product: Product | undefined,
): (variantId: string) => Promise<AddProductCardLineResult> {
    const { addLine } = useCartActions();
    const { postEvent } = useTrackable();
    const { locale } = useShop();
    const path = usePathname();

    return useCallback(
        async (variantId: string): Promise<AddProductCardLineResult> => {
            const variant = product?.variants?.edges?.find((edge) => edge.node.id === variantId)?.node;
            if (!product || !variant) {
                return { ok: false };
            }

            const snapshot: ProductSnapshot = {
                variantId,
                productHandle: product.handle ?? '',
                productTitle: product.title ?? '',
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

            const result = await addLine({ variantId, quantity: 1, snapshot });
            if (!result.ok) {
                toast.error(result.message);
                return { ok: false };
            }

            postEvent('add_to_cart', {
                path,
                gtm: {
                    ecommerce: {
                        currency: variant.price.currencyCode,
                        value: safeParseFloat(0, variant.price.amount),
                        items: [
                            {
                                item_id: productToMerchantsCenterId({
                                    locale,
                                    product: {
                                        productGid: product.id,
                                        variantGid: variantId,
                                    },
                                }),
                                item_name: product.title,
                                item_variant: variant.title,
                                item_brand: product.vendor,
                                item_category: product.productType || undefined,
                                product_id: product.id,
                                variant_id: variantId,
                                sku: variant.sku || undefined,
                                currency: variant.price.currencyCode,
                                price: safeParseFloat(undefined, variant.price.amount),
                                quantity: 1,
                            },
                        ],
                    },
                },
            });

            return { ok: true };
        },
        [addLine, postEvent, locale, path, product],
    );
}
