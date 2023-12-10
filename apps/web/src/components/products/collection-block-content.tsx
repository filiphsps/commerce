'use client';

import type { Product } from '@/api/product';
import ProductCard from '@/components/ProductCard';
import type { StoreModel } from '@/models/StoreModel';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import { Suspense } from 'react';

export type CollectionBlockContent = {
    locale: Locale;
    i18n: LocaleDictionary;
    products: Product[];
    store: StoreModel;
    priority?: boolean;
};
export const CollectionBlockContent = ({ locale, i18n, products, store, priority }: CollectionBlockContent) => {
    return (
        <>
            <Suspense>
                {products.map((product, index) => {
                    const element = (
                        <ProductProvider
                            key={product?.id}
                            data={product as any}
                            initialVariantId={FirstAvailableVariant(product)?.id}
                        >
                            <ProductCard store={store} locale={locale} i18n={i18n} priority={priority && index < 2} />
                        </ProductProvider>
                    );
                    return element;
                })}
            </Suspense>
        </>
    );
};
