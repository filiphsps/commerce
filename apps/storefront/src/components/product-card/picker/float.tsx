'use client';

import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { useMaybeProductOptions } from '@/components/product-options/context';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { getTranslations } from '@/utils/locale';
import type { ProductCardPickerProps } from './types';

/**
 * Reads the currently selected variant from the nearest `ProductOptions.Root`
 * context and calls `onAdd` with its ID when clicked.
 *
 * @param props.onAdd - Cart add callback forwarded from the picker orchestrator.
 * @param props.label - Localized add-to-cart label resolved by the picker.
 * @returns A button element wired to the active variant selection.
 */
const AddToBagButton = ({ onAdd, label }: { onAdd: (variantId: string) => void; label: string }) => {
    const ctx = useMaybeProductOptions();
    const variantId = ctx?.selectedVariant?.id;
    return (
        <button
            type="button"
            disabled={!variantId}
            data-testid="picker-add-to-cart"
            onClick={() => {
                if (variantId) onAdd(variantId);
            }}
            className="cursor-pointer rounded-(--block-border-radius-small) bg-(--product-card-cta-bg) p-3 font-semibold text-(--product-card-cta-color) text-xs tabular-nums leading-none disabled:cursor-not-allowed disabled:opacity-50"
        >
            {label}
        </button>
    );
};

/**
 * Floating popover picker that anchors to the CTA pill and shows a compact size selector.
 *
 * @param props.product - Product whose variants and options populate the picker.
 * @param props.open - Whether the popover is currently open.
 * @param props.onOpenChange - Callback invoked when the open state should change.
 * @param props.onAdd - Callback invoked with the selected variant ID when "Add to bag" is clicked.
 * @returns The Radix Popover element.
 */
const FloatPicker = ({ product, open, onOpenChange, onAdd, i18n }: ProductCardPickerProps) => {
    const { t } = getTranslations('common', i18n);
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
                    className="product-card-float-surface z-50 flex w-[var(--radix-popover-trigger-width,196px)] min-w-48 flex-col gap-2.5 rounded-(--block-border-radius-small) border border-black/[0.06] p-3 shadow-[0_12px_28px_-10px_rgb(20_17_11/0.22)]"
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
                        <AddToBagButton onAdd={onAdd} label={t('add-to-cart')} />
                    </ProductOptions.Root>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

FloatPicker.displayName = 'Nordcom.ProductCard.Picker.Float';

export default FloatPicker;
