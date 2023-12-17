'use client';

import type { Product } from '@/api/product';
import ProductCard from '@/components/ProductCard';
import type { StoreModel } from '@/models/StoreModel';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import { Suspense } from 'react';

export type CollectionBlockContent = {
    i18n: LocaleDictionary;
    products: Product[];
    store: StoreModel;
    priority?: boolean;
};
export const CollectionBlockContent = ({ i18n, products, store, priority }: CollectionBlockContent) => {
    return products.map((product, index) => (
        <Suspense key={product?.id || index}>
            <ProductProvider data={product as any} initialVariantId={FirstAvailableVariant(product)?.id}>
                <ProductCard store={store} i18n={i18n} priority={priority && index < 2} />
            </ProductProvider>
        </Suspense>
    ));
};
