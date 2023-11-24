'use client';

import english from '@/i18n/en.json';
import { Locale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';
import type { PartialDeep } from 'type-fest';

export const dynamic = 'force-dynamic';

const dummyShopify = {
    product: {
        id: 'gid://shopify/Product/1',
        title: 'Product title',
        vendor: 'Vendor',
        description: 'Product description',
        descriptionHtml: '<h2>Hello world!</h2>\n<p>Product html description</p>',
        variants: {
            edges: [
                {
                    node: {
                        id: 'gid://shopify/ProductVariant/1',
                        title: 'Variant title',
                        price: {
                            currencyCode: 'USD',
                            amount: '1.00'
                        },
                        compareAtPrice: {
                            currencyCode: 'USD',
                            amount: '2.00'
                        },
                        image: {
                            src: 'https://nordcom.io/image.png'
                        },
                        selectedOptions: [],
                        sellingPlanAllocations: {
                            edges: []
                        },
                        metafields: []
                    }
                }
            ]
        },
        options: [],
        sellingPlanGroups: {
            edges: []
        },
        metafields: []
    } as PartialDeep<
        Product,
        {
            recurseIntoArrays: true;
        }
    >
};

export default function SliceSimulatorPage() {
    const locale = Locale.default;

    return (
        <SliceSimulator
            background="transparent"
            sliceZone={({ slices, ...props }) => (
                <ProductProvider data={dummyShopify.product}>
                    <SliceZone
                        {...props}
                        components={slices as any}
                        context={{ locale, i18n: english, prefetch: {} }}
                    />
                </ProductProvider>
            )}
        />
    );
}
