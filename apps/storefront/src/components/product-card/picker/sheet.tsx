'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import * as ProductOptions from '@/components/product-options';
import { useMaybeProductOptions } from '@/components/product-options/context';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { capitalize, getTranslations } from '@/utils/locale';
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
 * Sheet/modal picker that slides up from the bottom on mobile and centers on desktop.
 *
 * @param props.product - Product whose options and variants populate the dialog.
 * @param props.open - Whether the dialog is currently open.
 * @param props.onOpenChange - Callback invoked when the open state should change.
 * @param props.onAdd - Callback invoked with the selected variant ID when "Add to bag" is clicked.
 * @returns The Radix Dialog element.
 */
const SheetPicker = ({ product, open, onOpenChange, onAdd, i18n }: ProductCardPickerProps) => {
    const { t } = getTranslations('common', i18n);
    const seed = firstAvailableVariant(product) ?? product.variants?.edges?.[0]?.node;
    const initialSelection = useMemo(() => toSelectionRecord(seed), [seed]);

    // The sheet is `bottom: 0` fixed; iOS Safari leaves it pinned behind the
    // keyboard (it ignores `interactiveWidget: 'resizes-content'`), so grow the
    // bottom padding by the occluded region to float the CTA above the keyboard.
    // `env(safe-area-inset-bottom)` is preserved in both branches.
    const keyboardInset = useVisualViewportInset();

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-20 bg-black/30 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in" />
                <Dialog.Content
                    aria-describedby={undefined}
                    style={
                        keyboardInset && keyboardInset > 0
                            ? { paddingBottom: `max(1rem, env(safe-area-inset-bottom), ${keyboardInset}px)` }
                            : undefined
                    }
                    className="fixed inset-x-0 bottom-0 z-30 flex w-full max-w-md flex-col gap-3 rounded-t-2xl border border-(--product-card-border-color) bg-(--surface-0) p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:p-[18px]"
                >
                    <span
                        aria-hidden
                        className="mx-auto -mt-1 mb-2 block h-[3px] w-8 rounded-full bg-(--surface-3) md:hidden"
                    />
                    <header className="flex items-center justify-between gap-3">
                        <Dialog.Title className="font-medium text-sm leading-snug">{product.title}</Dialog.Title>
                        <Dialog.Close
                            aria-label={capitalize(t('close'))}
                            className="text-(color:var(--text-muted)) hover:text-(color:var(--text)) inline-flex size-6 items-center justify-center focus-visible:outline-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <X aria-hidden className="size-full stroke-2" />
                        </Dialog.Close>
                    </header>
                    <VisuallyHidden.Root>
                        <Dialog.Description>{t('choose-product-options')}</Dialog.Description>
                    </VisuallyHidden.Root>
                    <ProductOptions.Root product={product} initialSelection={initialSelection}>
                        {(product.options ?? []).map((opt) => (
                            <div key={opt.name}>
                                <div className="mb-1.5 font-semibold text-(--product-card-vendor-color) text-[10px] uppercase tracking-(--product-card-eyebrow-tracking)">
                                    {opt.name}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <ProductOptions.Group name={opt.name} density="spacious" />
                                    <ProductOptions.More groupName={opt.name} />
                                </div>
                            </div>
                        ))}
                        <AddToBagButton onAdd={onAdd} label={t('add-to-cart')} />
                    </ProductOptions.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

SheetPicker.displayName = 'Nordcom.ProductCard.Picker.Sheet';

export default SheetPicker;
