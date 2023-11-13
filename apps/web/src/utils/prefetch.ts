import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { CollectionApi } from '@/api/shopify/collection';
import { VendorsApi } from '@/api/shopify/vendor';
import type { AbstractApi } from '@/utils/abstract-api';
import type { ProductEdge } from '@shopify/hydrogen-react/storefront-api-types';

const Prefetch = ({
    client: api,
    page,
    initialData
}: {
    client: AbstractApi;
    page?: CollectionPageDocumentData | ProductPageDocumentData | CustomPageDocumentData | null;
    initialData?: any;
}) => {
    return new Promise<{
        collections?: any;
        products?: any;
        shop?: any;
        vendors?: any;
    }>(async (resolve, reject) => {
        if (!page) {
            // No page data was supplied to prefetch.
            return resolve({});
        }

        const slices = page?.slices;
        let collections = initialData?.collections || {},
            products = initialData?.products || {},
            shop = initialData?.shop || {},
            vendors = initialData?.vendors || {};

        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.slice_type;
            try {
                switch (type) {
                    case 'collection': {
                        const handle: string | undefined = (slice?.primary as any)?.handle;
                        if (handle && !collections[handle]) {
                            collections[handle] = await CollectionApi({
                                api,
                                handle,
                                limit:
                                    (slice.variation !== 'full' && ((slice?.primary as any)?.limit || 16)) || undefined
                            });
                            if ((slice?.primary as any)?.limit && (slice?.primary as any)?.limit > 0)
                                collections[handle].products.edges = collections[handle].products.edges.slice(
                                    0,
                                    (slice?.primary as any)?.limit
                                );

                            // Only supply the used parameters
                            // TODO: This should be a utility function.
                            collections[handle].products.edges = (
                                collections[handle].products.edges as Array<ProductEdge>
                            ).map(
                                ({
                                    node: {
                                        id,
                                        handle,
                                        availableForSale,
                                        title,
                                        description,
                                        vendor,
                                        tags,
                                        seo,
                                        variants,
                                        images
                                    }
                                }) => ({
                                    node: {
                                        id,
                                        handle,
                                        availableForSale,
                                        title,
                                        description: (seo?.description || description).slice(0, 75),
                                        vendor,
                                        tags,
                                        sellingPlanGroups: {
                                            edges: []
                                        },
                                        variants: {
                                            edges: variants.edges.map(
                                                ({
                                                    node: {
                                                        id,
                                                        sku,
                                                        title,
                                                        price,
                                                        compareAtPrice,
                                                        availableForSale,

                                                        weight,
                                                        weightUnit,
                                                        image,
                                                        selectedOptions
                                                    }
                                                }) => ({
                                                    node: {
                                                        id,
                                                        sku,
                                                        title,
                                                        price,
                                                        compareAtPrice,
                                                        availableForSale,
                                                        weight,
                                                        weightUnit,
                                                        image,
                                                        selectedOptions
                                                    }
                                                })
                                            )
                                        },
                                        images
                                    }
                                })
                            );
                        }
                        break;
                    }
                    case 'vendors': {
                        vendors = await VendorsApi({ client: api });
                        break;
                    }
                }
            } catch (error) {
                reject(error);
            }
        }

        return resolve({
            collections,
            products,
            shop,
            vendors
        });
    });
};
export { Prefetch };
