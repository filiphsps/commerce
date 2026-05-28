'use client';

import { useProduct } from '@shopify/hydrogen-react';
import type { HTMLProps } from 'react';
import { Suspense, useEffect, useMemo } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { useMaybeProductOptions } from '@/components/product-options/context';
import { resolvedToLegacyOptions, resolveOptions } from '@/components/product-options/resolver';
import { ProductOptionsSelector, SizeChipRenderer } from '@/components/product-options-selector';
import AddToCart from '@/components/products/add-to-cart';
import { ProductQuantityBreaks } from '@/components/products/product-quantity-breaks';
import { useQuantity } from '@/components/products/quantity-provider';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';
import { useVariantUrlSync } from '@/hooks/useVariantUrlSync';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductActionsContainerProps = {
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

/**
 * Client component composing the quantity selector, option pickers, quantity breaks, and add-to-cart button.
 *
 * @param props.i18n - Locale dictionary forwarded to child action components.
 * @returns The product actions container, or `null` when product or selected variant is unavailable.
 */
export const ProductActionsContainer = ({ className, i18n, ...props }: ProductActionsContainerProps) => {
    const { t } = getTranslations('common', i18n);
    const { locale } = useShop();
    const { quantity, setQuantity } = useQuantity();

    const { product, selectedVariant, selectedOptions, setSelectedOptions } = useProduct() as ReturnType<
        typeof useProduct
    > & {
        product: Product | undefined;
        selectedVariant: ProductVariant | undefined;
    };

    const urlSyncOptions = useMemo(
        () =>
            Object.entries(selectedOptions ?? {})
                .filter((entry): entry is [string, string] => entry[1] !== undefined)
                .map(([name, value]) => ({ name, value })),
        [selectedOptions],
    );
    useVariantUrlSync(urlSyncOptions);

    const resolvedSelectedOptions = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(selectedOptions ?? {}).filter(
                    (entry): entry is [string, string] => entry[1] !== undefined,
                ),
            ),
        [selectedOptions],
    );

    const mappedOptions = useMemo(
        () => (product ? resolvedToLegacyOptions(resolveOptions(product, resolvedSelectedOptions)) : []),
        [product, resolvedSelectedOptions],
    );

    // Keep ProductOptionsContext (read by VariantPriceClient, VariantStockUrgencyClient) in sync
    // with Hydrogen's selected options so price and stock urgency update when the variant changes.
    const productOptionsCtx = useMaybeProductOptions();
    useEffect(() => {
        productOptionsCtx?.selectVariant(resolvedSelectedOptions);
    }, [productOptionsCtx?.selectVariant, resolvedSelectedOptions]);

    if (!product || !selectedVariant) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <div {...props} className={cn('flex flex-wrap gap-2', className)} suppressHydrationWarning={true}>
                <div className="flex flex-col gap-1" suppressHydrationWarning={true}>
                    <Label className="text-gray-600" style={{ gridArea: 'quantity-label' }}>
                        {t('quantity')}
                    </Label>

                    <QuantitySelector
                        update={(value) => {
                            if (value === quantity) {
                                return;
                            }
                            setQuantity(value);
                        }}
                        value={quantity}
                        i18n={i18n}
                        style={{ gridArea: 'quantity' }}
                        buttonClassName="disabled:opacity-0 bg-white"
                    />
                </div>

                <Suspense fallback={<div className="flex" data-skeleton />}>
                    <ProductOptionsSelector
                        options={mappedOptions}
                        selectedOptions={resolvedSelectedOptions}
                        onChange={setSelectedOptions}
                        renderers={{ Size: SizeChipRenderer }}
                        productHandle={product.handle}
                        locale={locale}
                    />
                </Suspense>
            </div>

            <Suspense>
                <ProductQuantityBreaks i18n={i18n} />
            </Suspense>

            <Suspense fallback={<AddToCart.skeleton />}>
                <AddToCart
                    redirect={true}
                    className="py-3 text-base lg:py-4 lg:text-lg"
                    quantity={quantity}
                    i18n={i18n}
                    data={{
                        product,
                        selectedVariant,
                    }}
                />
            </Suspense>
        </div>
    );
};
ProductActionsContainer.displayName = 'Nordcom.Products.ActionsContainer';
