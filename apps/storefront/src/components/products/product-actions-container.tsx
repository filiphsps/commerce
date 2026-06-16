'use client';

import type { HTMLProps } from 'react';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as ProductOptions from '@/components/product-options';
import { useProductOptions } from '@/components/product-options/context';
import AddToCart from '@/components/products/add-to-cart';
import { ProductQuantityBreaks } from '@/components/products/product-quantity-breaks';
import { useQuantity } from '@/components/products/quantity-provider';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';
import { useVariantUrlSync } from '@/hooks/useVariantUrlSync';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductActionsContainerProps = {
    i18n: LocaleDictionary;
    /**
     * URL-resolved initial selection (`?variant=` / option params) applied once on mount. The
     * page-level `ProductOptions.Root` seeds from `firstAvailableVariant` server-side, where the
     * search params are not in scope; this honors a deep link client-side.
     */
    seedSelection?: Record<string, string>;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

/**
 * Builds a stable, order-independent key for a selection map so two maps with the same entries compare equal.
 *
 * @param selection - Option-name-to-value map.
 * @returns A sorted `name=value&…` key string.
 */
function selectionKey(selection: Record<string, string>): string {
    return Object.entries(selection)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
}

/**
 * Client component composing the quantity selector, variant swatch pickers, quantity breaks, and add-to-cart
 * button. Selection state is driven entirely by the surrounding `ProductOptions.Root` — the same context and
 * swatch primitives the product card and cart line render — so the PDP, card, and cart share one variant UI.
 *
 * @param props.i18n - Locale dictionary forwarded to child action components.
 * @param props.seedSelection - URL-resolved selection applied once on mount.
 * @returns The product actions container, or `null` when product or selected variant is unavailable.
 */
export const ProductActionsContainer = ({ className, i18n, seedSelection, ...props }: ProductActionsContainerProps) => {
    const { t } = getTranslations('common', i18n);
    const { quantity, setQuantity } = useQuantity();

    const { product, selection, selectedVariant, selectVariant } = useProductOptions();

    // Apply the URL-resolved selection once. Guard on the ref so it never re-fires (and so a later
    // user pick is never clobbered), and skip when it already matches to avoid a redundant URL write.
    const seededRef = useRef(false);
    useEffect(() => {
        if (seededRef.current) return;
        seededRef.current = true;
        if (!seedSelection || Object.keys(seedSelection).length === 0) return;
        if (selectionKey(seedSelection) !== selectionKey(selection)) {
            selectVariant(seedSelection);
        }
    }, [seedSelection, selection, selectVariant]);

    const urlSyncOptions = useMemo(
        () => Object.entries(selection).map(([name, value]) => ({ name, value })),
        [selection],
    );
    useVariantUrlSync(urlSyncOptions);

    const optionGroups = useMemo(
        () => (product.options ?? []).filter((o) => o.name && o.name.toLowerCase() !== 'title'),
        [product.options],
    );

    if (!product || !selectedVariant) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <div {...props} className={cn('flex flex-wrap gap-2', className)} suppressHydrationWarning={true}>
                <div className="flex flex-col gap-1" suppressHydrationWarning={true}>
                    <Label className="text-(--text-muted)" style={{ gridArea: 'quantity-label' }}>
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
                        buttonClassName="disabled:opacity-0 bg-(--surface-0)"
                    />
                </div>

                <Suspense fallback={<div className="flex" data-skeleton />}>
                    <div className="flex flex-col gap-(--block-spacer-small)">
                        {optionGroups.map((option) => (
                            <fieldset
                                key={option.name}
                                aria-label={option.name}
                                className="flex flex-col gap-(--block-spacer-small)"
                            >
                                <Label className="text-(color:var(--text-muted)) h-fit">{option.name}</Label>
                                <ProductOptions.Group name={option.name} density="spacious" />
                            </fieldset>
                        ))}
                    </div>
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
