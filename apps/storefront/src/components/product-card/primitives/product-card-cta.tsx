'use client';

import { useCallback } from 'react';
import { getProductCardCta } from '@/components/product-card/cta';
import { useAddProductCardLine } from '@/components/product-card/use-add-product-card-line';
import { capitalize, getTranslations, type LocaleDictionary } from '@/utils/locale';
import { usePickerOpen, useVariantSelection } from './product-card-options-provider';

export type ProductCardCtaProps = {
    placement: string;
    i18n: LocaleDictionary;
};

/**
 * Client component that reads variant-selection context and renders the registered CTA for the given placement.
 * For single-variant products, `onAdd` adds the seed variant through the shared {@link useAddProductCardLine}
 * helper (which owns snapshot construction, failure toasts, and analytics). For multi-variant products,
 * `onAdd` opens the picker instead.
 *
 * @param props.placement - Registry key identifying which CTA component to render.
 * @returns The resolved CTA element, or `null` when context is unavailable.
 */
const ProductCardCta = ({ placement, i18n }: ProductCardCtaProps) => {
    const sel = useVariantSelection();
    const picker = usePickerOpen();
    const { t } = getTranslations('common', i18n);
    const addProductCardLine = useAddProductCardLine(sel?.product);

    const onAdd = useCallback(async () => {
        if (!sel || !picker) return;

        if (picker.isSingleBuyable) {
            // Failure handling and analytics live in the helper; the single-variant
            // fast path has no picker to dismiss, so the result is intentionally unused.
            await addProductCardLine(sel.selectedVariantId);
        } else {
            picker.setOpen(true);
        }
    }, [sel, picker, addProductCardLine]);

    if (!sel || !picker) return null;

    const Cta = getProductCardCta(placement);

    return (
        <Cta
            productHandle={sel.product.handle}
            seedVariantId={sel.selectedVariantId}
            isSingleBuyable={picker.isSingleBuyable}
            isOpen={picker.open}
            onActivate={() => picker.setOpen(!picker.open)}
            onAdd={onAdd}
            labels={{
                add: t('add-to-cart'),
                choose: t('choose-product-options'),
                close: capitalize(t('close')),
            }}
        />
    );
};

ProductCardCta.displayName = 'Nordcom.ProductCard.Cta';

export default ProductCardCta;
