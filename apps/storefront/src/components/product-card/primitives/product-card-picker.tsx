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
