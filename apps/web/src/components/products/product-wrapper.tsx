'use client';

import type { Product } from '@/api/product';
import { deepEqual } from '@/utils/deep-equal';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { ReactNode } from 'react';
import { memo } from 'react';

export type ProductWrapperProps = {
    product: Product;
    children?: ReactNode;
};
const ProductWrapper = memo(
    ({ product, children }: ProductWrapperProps) => (
        <ProductProvider data={product as any} initialVariantId={FirstAvailableVariant(product)?.id}>
            {children}
        </ProductProvider>
    ),
    deepEqual
);

ProductWrapper.displayName = 'Nordcom.Products.ProductWrapper';
export { ProductWrapper };
