'use client';

import type { Product } from '@/api/product';
import ProductCardActions from '@/components/ProductCard/product-card-actions';
import ProductCardBadges from '@/components/ProductCard/product-card-badges';
import ProductCardImage from '@/components/ProductCard/product-card-image';
import ProductCardOptions from '@/components/ProductCard/product-card-options';
import styles from '@/components/ProductCard/product-card.module.scss';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { ReactNode } from 'react';

export type ProductCardBodyProps = {
    data?: Product;
    priority?: boolean;
    i18n: LocaleDictionary;
    children?: ReactNode;
};
const ProductCardBody = ({ data: product, priority, i18n, children }: ProductCardBodyProps) => {
    if (!product) return null;

    return (
        <ProductProvider data={product as any} initialVariantId={FirstAvailableVariant(product)?.id}>
            <ProductCardImage data={product} priority={priority}>
                <ProductCardBadges i18n={i18n} />
            </ProductCardImage>

            <div className={styles.details}>
                {children}
                <ProductCardOptions i18n={i18n} />
            </div>

            <ProductCardActions i18n={i18n} />
        </ProductProvider>
    );
};

ProductCardBody.displayName = 'Nordcom.ProductCard.Body';
export default ProductCardBody;
