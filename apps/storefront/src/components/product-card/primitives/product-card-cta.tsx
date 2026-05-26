'use client';

import { getProductCardCta } from '@/components/product-card/cta';
import { usePickerOpen, useVariantSelection } from './product-card-options-provider';

export type ProductCardCtaProps = {
    placement: string;
};

const ProductCardCta = ({ placement }: ProductCardCtaProps) => {
    const sel = useVariantSelection();
    const picker = usePickerOpen();
    if (!sel || !picker) return null;

    const Cta = getProductCardCta(placement);

    return (
        <Cta
            productHandle={sel.product.handle}
            seedVariantId={sel.selectedVariantId}
            isSingleBuyable={picker.isSingleBuyable}
            isOpen={picker.open}
            onActivate={() => picker.setOpen(!picker.open)}
            onAdd={() => {
                // Phase 3 intermediate state: fast-path falls back to opening
                // the picker. Real cart wiring lands when the orchestrator (Task
                // 3.12) plugs in the existing cart server action; the green dot
                // still telegraphs the fast-path intent.
                picker.setOpen(true);
            }}
        />
    );
};

ProductCardCta.displayName = 'Nordcom.ProductCard.Cta';

export default ProductCardCta;
