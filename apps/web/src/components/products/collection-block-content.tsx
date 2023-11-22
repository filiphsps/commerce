'use client';

import ProductCard from '@/components/ProductCard';
import type { StoreModel } from '@/models/StoreModel';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { ProductEdge } from '@shopify/hydrogen-react/storefront-api-types';

export type CollectionBlockContent = {
    locale: Locale;
    i18n: LocaleDictionary;
    products: ProductEdge[];
    store: StoreModel;
};
export const CollectionBlockContent = ({ locale, i18n, products, store }: CollectionBlockContent) => {
    return (
        <>
            {products.map(({ node: product }) => (
                <ProductProvider key={product?.id} data={product} initialVariantId={FirstAvailableVariant(product)?.id}>
                    <ProductCard store={store} locale={locale} i18n={i18n} />
                </ProductProvider>
            ))}
        </>
    );
};
