'use client';

import { useProduct } from '@shopify/hydrogen-react';

import { Content as Body } from '@/components/typography/content';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import type { ReactNode } from 'react';

/**
 * Props for `ProductDescription`.
 */
export type ProductDescriptionProps = SliceComponentProps<Content.ProductDescriptionSlice>;

/**
 * Component for "ProductDescription" Slices.
 */
const ProductDescription = ({ slice }: ProductDescriptionProps): ReactNode => {
    const { product } = useProduct();
    if (!product || !product.descriptionHtml) return null;

    return (
        <section data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <Body
                dangerouslySetInnerHTML={{
                    __html: product.descriptionHtml
                }}
            />
        </section>
    );
};

export default ProductDescription;
