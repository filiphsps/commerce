'use client';

import { Fragment, Suspense } from 'react';

import ProductCardActions from '@/components/product-card/product-card-actions';
import ProductCardOptions from '@/components/product-card/product-card-options';

import type { Product, ProductVariant } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    data?: Product;
    selected?: ProductVariant;
    setSelected: (variant: () => ProductVariant) => void;
    locale: Locale;
    i18n: LocaleDictionary;
};
const ProductCardFooter = ({ data: product, selected, setSelected, i18n, locale }: ProductCardFooterProps) => {
    if (!product) {
        return null;
    }

    return (
        <>
            <ProductCardOptions
                locale={locale}
                data={product}
                selectedVariant={selected}
                setSelectedVariant={(variant) => setSelected(() => variant)}
            />

            {selected ? (
                <Suspense fallback={<Fragment />}>
                    <ProductCardActions i18n={i18n} data={product} selectedVariant={selected} />
                </Suspense>
            ) : null}
        </>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
