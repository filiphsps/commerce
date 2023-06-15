import { CollectionApi } from '../api/collection';
import { Config } from './Config';
import { CustomPageDocument } from '../../prismicio-types';

const Prefetch = (page: CustomPageDocument<string>, query: any, locale: string) => {
    if (locale === 'default')
        locale = Config.i18n.locales[1];
    
    return new Promise<{
        collections?: any;
        products?: any;
        shop?: any;
        vendors?: any;
    }>(async (resolve, reject) => {
        if (!page) return reject(new Error('404: Invalid page'));

        const slices = page?.data.slices;
        let collections = {},
            products = {},
            shop = {},
            vendors = {};

        // FIXME: support nested components
        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.slice_type;
            const handle = (slice.primary as any).handle;

            try {
                switch (type) {
                    case 'collection':
                        if (handle && !process.browser) {
                            collections[handle] = await CollectionApi({ handle, locale });
                            if (slice.primary.limit && slice.primary.limit > 0)
                                collections[handle].products.edges = collections[
                                    handle
                                ].products.edges.slice(0, slice?.primary?.limit);
                        }
                        break;
                    /*case 'ContentBlock':
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
                        break;*/
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
