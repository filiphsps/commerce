'use client';

import type { Product } from '@/api/product';
import ProductCardFooter from '@/components/ProductCard/product-card-footer';
import ProductCardOptions from '@/components/ProductCard/product-card-options';
import styles from '@/components/ProductCard/product-card.module.scss';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense, useState, type ReactNode } from 'react';

export type ProductCardActionsProps = {
    data?: Product;
    locale: Locale;
    i18n: LocaleDictionary;
    children?: ReactNode;
};
const ProductCardActions = ({ data: product, i18n, locale, children }: ProductCardActionsProps) => {
    const [selectedVariant, setSelectedVariant] = useState(FirstAvailableVariant(product)!);

    if (!product) return null;

    return (
        <>
            <div className={styles.details}>
                {children}
                <Suspense>
                    <ProductCardOptions
                        locale={locale}
                        data={product}
                        selectedVariant={selectedVariant}
                        setSelectedVariant={(variant) => setSelectedVariant(() => variant)}
                    />
                </Suspense>
            </div>

            <Suspense>
                <ProductCardFooter locale={locale} i18n={i18n} data={product} selectedVariant={selectedVariant} />
            </Suspense>
        </>
    );
};

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
