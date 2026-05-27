'use client';

import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { ProductCardPickerProps } from './types';

/**
 * Inline expando picker that renders all product option groups directly inside the card layout.
 *
 * @param props.product - Product whose options and variants are displayed.
 * @param props.open - When `false`, renders nothing.
 * @returns The option group container, or `null` when closed.
 */
const InlinePicker = ({ product, open }: ProductCardPickerProps) => {
    const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
    const initialSelection = useMemo(() => toSelectionRecord(seed), [seed]);

    if (!open) return null;

    return (
        <div
            role="group"
            aria-label="Product options"
            className="flex w-full flex-col gap-2 rounded-(--block-border-radius-small) border border-(--product-card-border-color) bg-(--product-card-more-bg) p-3"
        >
            <ProductOptions.Root product={product} initialSelection={initialSelection}>
                {(product.options ?? []).map((opt) => (
                    <div key={opt.name}>
                        <div className="mb-1.5 font-semibold text-(--product-card-vendor-color) text-[10px] uppercase tracking-(--product-card-eyebrow-tracking)">
                            {opt.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <ProductOptions.Group name={opt.name} density="compact" />
                            <ProductOptions.More groupName={opt.name} />
                        </div>
                    </div>
                ))}
                <button
                    type="button"
                    className="cursor-pointer rounded-(--block-border-radius-small) bg-(--product-card-cta-bg) p-3 font-semibold text-(--product-card-cta-color) text-xs tabular-nums leading-none"
                >
                    Add to bag
                </button>
            </ProductOptions.Root>
        </div>
    );
};

InlinePicker.displayName = 'Nordcom.ProductCard.Picker.Inline';

export default InlinePicker;
