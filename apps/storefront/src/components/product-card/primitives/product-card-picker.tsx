'use client';

import { useCallback } from 'react';
import type { Product } from '@/api/product';
import { getProductCardPicker } from '@/components/product-card/picker';
import { useAddProductCardLine } from '@/components/product-card/use-add-product-card-line';
import { useIsDesktop } from '@/components/product-options/use-is-desktop';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { usePickerOpen, useVariantSelection } from './product-card-options-provider';

type Presentation = 'auto' | 'float' | 'sheet' | 'inline';

export type ProductCardPickerProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    presentation: Presentation;
    ctaPlacement: string;
    layout: 'vertical' | 'horizontal';
};

/**
 * Resolves the concrete picker variant from the requested presentation mode and current context.
 *
 * @param presentation - Requested presentation; `'auto'` defers to layout and device heuristics.
 * @param layout - Card layout direction used to select a sensible default.
 * @param ctaPlacement - CTA registry key; `'inline-button'` selects the inline picker when in auto mode.
 * @param isMobile - Whether the viewport is narrower than the md breakpoint.
 * @returns The resolved non-auto presentation variant.
 */
const resolvePresentation = (
    presentation: Presentation,
    layout: 'vertical' | 'horizontal',
    ctaPlacement: string,
    isMobile: boolean,
): Exclude<Presentation, 'auto'> => {
    if (presentation !== 'auto') return presentation;
    if (layout === 'horizontal') return 'sheet';
    if (isMobile) return 'sheet';
    if (ctaPlacement === 'inline-button') return 'inline';
    return 'float';
};

/**
 * Client component that resolves and renders the appropriate variant picker for the product card.
 * Wires the shared {@link useAddProductCardLine} helper into the picker's "Add to bag" button and
 * dismisses the picker only when the add succeeds — a failed add keeps it open so the error toast
 * stays in context.
 *
 * @param props.locale - Active locale forwarded to the resolved picker.
 * @param props.i18n - Locale dictionary forwarded to the resolved picker.
 * @param props.presentation - Preferred picker presentation mode; `'auto'` adapts to layout and device.
 * @param props.ctaPlacement - CTA registry key used in auto-mode resolution.
 * @param props.layout - Card layout direction used in auto-mode resolution.
 * @returns The resolved picker element, or `null` when context is unavailable.
 */
const ProductCardPicker = ({ locale, i18n, presentation, ctaPlacement, layout }: ProductCardPickerProps) => {
    const sel = useVariantSelection();
    const picker = usePickerOpen();
    const addProductCardLine = useAddProductCardLine(sel?.product);

    const onAdd = useCallback(
        async (variantId: string) => {
            const result = await addProductCardLine(variantId);
            if (result.ok) {
                picker?.setOpen(false);
            }
        },
        [addProductCardLine, picker],
    );

    // null until the first client-side effect runs — matches SSR output and avoids
    // calling window.matchMedia synchronously (which throws in WKWebView in-app browsers).
    const isDesktop = useIsDesktop();

    if (!sel || !picker) return null;
    if (isDesktop === null) return null;

    const shape = resolvePresentation(presentation, layout, ctaPlacement, !isDesktop);

    const Picker = getProductCardPicker(shape);
    return (
        <Picker
            product={sel.product as Product}
            locale={locale}
            i18n={i18n}
            open={picker.open}
            onOpenChange={picker.setOpen}
            onAdd={onAdd}
        />
    );
};

ProductCardPicker.displayName = 'Nordcom.ProductCard.Picker';

export default ProductCardPicker;
