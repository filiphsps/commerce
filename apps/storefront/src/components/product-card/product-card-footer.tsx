'use client';

import { useState } from 'react';

import { FirstAvailableVariant } from '@/utils/first-available-variant';

import ProductCardActions from '@/components/product-card/product-card-actions';
import ProductCardOptions from '@/components/product-card/product-card-options';
import Pricing from '@/components/typography/pricing';

import type { Product } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    data?: Product;
    locale: Locale;
    i18n: LocaleDictionary;
};
const ProductCardFooter = ({ data: product, i18n, locale }: ProductCardFooterProps) => {
    const [selectedVariant, setSelectedVariant] = useState(FirstAvailableVariant(product)!);
    if (!product) {
        return null;
    }

    return (
        <div className="flex h-full min-h-24 w-full grow flex-col pt-1">
            <Pricing price={selectedVariant.price as any} />

            <ProductCardOptions
                locale={locale}
                data={product}
                selectedVariant={selectedVariant}
                setSelectedVariant={(variant) => setSelectedVariant(() => variant)}
            />

            <ProductCardActions i18n={i18n} data={product} selectedVariant={selectedVariant} />
        </div>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
