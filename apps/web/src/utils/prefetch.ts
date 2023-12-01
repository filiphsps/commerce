import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { CollectionApi } from '@/api/shopify/collection';
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
        const shop = api.shop();

        const slices = page?.slices;
        let collections = initialData?.collections || {},
            products = initialData?.products || {},
            vendors = initialData?.vendors || [];

        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.slice_type;

            try {
                switch (type) {
                    case 'collection': {
                        const handle: string | undefined = (slice?.primary as any)?.handle;
                        const limit = (slice?.primary as any)?.limit || 16;

                        if (!handle || collections[handle]) continue;

                        try {
                            let collection = await CollectionApi({
                                api,
                                handle,
                                // TODO: Pagination for the full variation.
                                limit: slice.variation === 'full' ? 200 : limit
                            });

                            if (!collection) {
                                console.warn(`Collection "${handle}" not found.`);
                                continue; // TODO: Figure out if we should throw here.
                            } else if (!collection?.products?.edges) {
                                console.warn(`No products in collection "${collection.handle || handle}".`);
                                continue; // TODO: Figure out if we should throw here.
                            }

                            collections[handle] = {
                                ...collection,
                                products: {
                                    ...collection.products,
                                    edges: (collection.products.edges as ProductEdge[])
                                        .map(
                                            (
                                                {
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
                                                },
                                                index
                                            ) => {
                                                if (
                                                    (slice?.primary as any)?.limit &&
                                                    (slice?.primary as any)?.limit > 0 &&
                                                    (slice?.primary as any)?.limit <= index
                                                ) {
                                                    return null;
                                                }

                                                return {
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
                                                            edges:
                                                                variants?.edges.map(
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
                                                                ) || []
                                                        },
                                                        images
                                                    }
                                                };
                                            }
                                        )
                                        .filter((_) => _)
                                }
                            } as any;
                        } catch (error: unknown) {
                            console.warn(`Collection "${handle}" failed prefetch for tenant "${shop.id}".`, error);
                        }
                        continue;
                    }
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
