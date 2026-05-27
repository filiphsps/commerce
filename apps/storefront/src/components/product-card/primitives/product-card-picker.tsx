'use client';

import type { Product } from '@/api/product';
import { getProductCardPicker } from '@/components/product-card/picker';
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
    if (!sel || !picker) return null;

    // SSR-safe: assume non-mobile, hydrate corrects on client. md breakpoint = 768px.
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const shape = resolvePresentation(presentation, layout, ctaPlacement, isMobile);

    const Picker = getProductCardPicker(shape);
    return (
        <Picker
            product={sel.product as Product}
            locale={locale}
            i18n={i18n}
            open={picker.open}
            onOpenChange={picker.setOpen}
        />
    );
};

ProductCardPicker.displayName = 'Nordcom.ProductCard.Picker';

export default ProductCardPicker;
