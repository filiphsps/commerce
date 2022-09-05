import { CollectionApi } from '../api/collection';
import { PageModel } from '../models/PageModel';
import { ProductsApi } from '../api/product';
import { VendorsApi } from '../api/vendor';

const Prefetch = (page: PageModel, query: any) => {
    return new Promise<{
        collections?: any;
        products?: any;
        shop?: any;
        vendors?: any;
    }>(async (resolve, reject) => {
        if (!page) return reject();

        const slices = page?.slices || page?.body;
        let collections = {},
            products = {},
            shop = {},
            vendors = {};

        // FIXME: support nested components
        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.type || slice?.slice_type;
            const handle = slice?.data?.handle || slice?.primary?.handle;

            switch (type) {
                case 'CollectionBlock':
                case 'collection':
                    if (handle && !process.browser) {
                        collections[handle] = await CollectionApi(handle);
                        if (slice?.primary?.limit > 0)
                            collections[handle].items = collections[
                                handle
                            ].items.slice(0, slice?.primary?.limit);
                    }
                    break;
                case 'ContentBlock':
                    const res = await Prefetch(
                        {
                            slices: slice?.data?.slices
                        } as any,
                        query
                    );

                    collections = {
                        ...collections,
                        ...res?.collections
                    };
                    products = {
                        ...products,
                        ...res?.products
                    };
                    shop = {
                        ...shop,
                        ...res?.shop
                    };
                    break;
                case 'ContentBlock':
                    for (let i = 0; i < slice?.data?.items?.length; i++) {
                        const slices = slice?.data?.items?.[i]?.slices;
                        const res = await Prefetch(
                            {
                                slices
                            } as any,
                            query
                        );

                        collections = {
                            ...collections,
                            ...res?.collections
                        };
                        products = {
                            ...products,
                            ...res?.products
                        };
                        shop = {
                            ...shop,
                            ...res?.shop
                        };
                    }
                    break;
                case 'shopblock':
                    shop = (await ProductsApi()) ?? {};
                    vendors = (await VendorsApi()) ?? {};
                    break;
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
