'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { ProductCardPickerProps } from './types';

/**
 * Floating popover picker that anchors to the CTA pill and shows a compact size selector.
 *
 * @param props.product - Product whose variants and options populate the picker.
 * @param props.open - Whether the popover is currently open.
 * @param props.onOpenChange - Callback invoked when the open state should change.
 * @returns The Radix Popover element.
 */
const FloatPicker = ({ product, open, onOpenChange }: ProductCardPickerProps) => {
    const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
    const initialSelection = useMemo(() => (seed ? toSelectionRecord(seed) : {}), [seed]);

    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Anchor className="absolute top-2.5 right-2.5 size-9" />
            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="end"
                    sideOffset={6}
                    className="z-50 flex w-[var(--radix-popover-trigger-width,196px)] min-w-48 flex-col gap-2.5 rounded-(--block-border-radius-small) border border-black/[0.06] bg-white/97 p-3 shadow-[0_12px_28px_-10px_rgb(20_17_11/0.22)] backdrop-blur-md"
                >
                    <ProductOptions.Root product={product} initialSelection={initialSelection}>
                        <div>
                            <div className="mb-1.5 font-semibold text-(--product-card-vendor-color) text-[10px] uppercase tracking-(--product-card-eyebrow-tracking)">
                                Size
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <ProductOptions.Group name="Size" density="compact" />
                                <ProductOptions.More groupName="Size" />
                            </div>
                        </div>
                        <button
                            type="button"
                            className="cursor-pointer rounded-(--block-border-radius-small) bg-(--product-card-cta-bg) p-3 font-semibold text-(--product-card-cta-color) text-xs tabular-nums leading-none"
                        >
                            Add to bag
                        </button>
                    </ProductOptions.Root>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

FloatPicker.displayName = 'Nordcom.ProductCard.Picker.Float';

export default FloatPicker;
