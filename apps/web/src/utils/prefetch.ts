import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { VendorsApi } from '@/api/shopify/vendor';
import type { VendorModel } from '@/models/VendorModel';
import type { AbstractApi } from '@/utils/abstract-api';
import type { CollectionEdge, ProductEdge } from '@shopify/hydrogen-react/storefront-api-types';

export type PrefetchData = {
    collections?: { [key: string]: CollectionEdge['node'] };
    products?: { [key: string]: ProductEdge };
    vendors?: VendorModel[];
};

/**
 * @deprecated Migrate to the preloading pattern {@link https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#preloading-data}.
 */
const Prefetch = ({
    api,
    page,
    initialData
}: {
    api: AbstractApi;
    page?: CollectionPageDocumentData | ProductPageDocumentData | CustomPageDocumentData | null;
    initialData?: PrefetchData;
}) => {
    return new Promise<PrefetchData>(async (resolve, reject) => {
        if (!page) {
            // No page data to go of was supplied to prefetch.
            return resolve({});
        }

        const slices = page?.slices;
        let collections = initialData?.collections || {},
            products = initialData?.products || {},
            vendors = initialData?.vendors || [];

        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.slice_type;

            try {
                switch (type) {
                    case 'vendors': {
                        if (vendors && vendors?.length > 0) continue;

                        vendors = await VendorsApi({ api });
                        continue;
                    }
                }
            } catch (error) {
                reject(error);
            }
        }

        return resolve({
            collections: Object.keys(collections).length > 0 ? collections : undefined,
            products: Object.keys(products).length > 0 ? products : undefined,
            vendors
        } as any);
    });
};
export { Prefetch };
