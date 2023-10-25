import { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { CollectionApi } from '@/api/collection';
import type { ProductVisuals } from '@/api/product';
import { VendorsApi } from '@/api/vendor';
import type { Locale } from '@/utils/locale';
import type { ProductEdge } from '@shopify/hydrogen-react/storefront-api-types';

const Prefetch = (
    page: CollectionPageDocumentData | ProductPageDocumentData | CustomPageDocumentData,
    locale: Locale,
    initialData?: any
) => {
    return new Promise<{
        collections?: any;
        products?: any;
        shop?: any;
        vendors?: any;
    }>(async (resolve, reject) => {
        if (!page) return reject(new Error('404: Invalid page'));

        const slices = page?.slices;
        let collections = initialData?.collections || {},
            products = initialData?.products || {},
            shop = initialData?.shop || {},
            vendors = initialData?.vendors || {};

        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.slice_type;
            const handle: string | undefined = (slice?.primary as any)?.handle;

            try {
                switch (type) {
                    case 'collection':
                        if (handle && !collections[handle]) {
                            collections[handle] = await CollectionApi({
                                handle,
                                locale,
                                limit: (slice?.primary as any)?.limit || 16
                            });
                            if ((slice?.primary as any)?.limit && (slice?.primary as any)?.limit > 0)
                                collections[handle].products.edges = collections[handle].products.edges.slice(
                                    0,
                                    (slice?.primary as any)?.limit
                                );

                            // Only supply the used parameters
                            // TODO: this should be a utility function.
                            collections[handle].products.edges = (
                                collections[handle].products.edges as Array<
                                    ProductEdge & { node: { visuals: ProductVisuals } }
                                >
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
                                        images,
                                        visuals
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
                                                        image,
                                                        selectedOptions
                                                    }
                                                })
                                            )
                                        },
                                        images,
                                        visuals
                                    }
                                })
                            );
                        }
                        break;
                    case 'vendors':
                        vendors = await VendorsApi({ locale });
                        break;
                }
            } catch (error) {
                console.error(error);
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
