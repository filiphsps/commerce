'use client';

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
 * Inline expando picker that renders all product option groups directly inside the card layout.
 *
 * @param props.product - Product whose options and variants are displayed.
 * @param props.open - When `false`, renders nothing.
 * @param props.onAdd - Callback invoked with the selected variant ID when "Add to bag" is clicked.
 * @returns The option group container, or `null` when closed.
 */
const InlinePicker = ({ product, open, onAdd, i18n }: ProductCardPickerProps) => {
    const { t } = getTranslations('common', i18n);
    const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
    const initialSelection = useMemo(() => toSelectionRecord(seed), [seed]);

    if (!open) return null;

    return (
        <fieldset
            aria-label={t('product-options')}
            className="flex w-full min-w-0 flex-col gap-2 rounded-(--block-border-radius-small) border border-(--product-card-border-color) bg-(--product-card-more-bg) p-3"
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
                <AddToBagButton onAdd={onAdd} label={t('add-to-cart')} />
            </ProductOptions.Root>
        </fieldset>
    );
};

InlinePicker.displayName = 'Nordcom.ProductCard.Picker.Inline';

export default InlinePicker;
