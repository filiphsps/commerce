import { CollectionPageDocument, CustomPageDocument, ProductPageDocument } from '../../prismicio-types';

import { CollectionApi } from '../api/collection';
import { Config } from './Config';
import { VendorsApi } from 'src/api/vendor';

const Prefetch = (
    page: CustomPageDocument<string> | ProductPageDocument<string> | CollectionPageDocument<string>,
    query: any,
    locale?: string,
    initialData?: any
) => {
    if (!locale || locale === 'x-default') locale = Config.i18n.default;

    return new Promise<{
        collections?: any;
        products?: any;
        shop?: any;
        vendors?: any;
    }>(async (resolve, reject) => {
        if (!page) return reject(new Error('404: Invalid page'));

        const slices = page?.data.slices;
        let collections = initialData?.collections || {},
            products = initialData?.products || {},
            shop = initialData?.shop || {},
            vendors = initialData?.vendors || {};

        for (let i = 0; i < slices?.length; i++) {
            const slice = slices[i];
            const type = slice?.slice_type;
            const handle = (slice.primary as any).handle;

            try {
                switch (type) {
                    case 'collection':
                        if (handle && !collections[handle] && slice.variation === 'default') {
                            collections[handle] = await CollectionApi({
                                handle,
                                locale,
                                limit: slice?.primary?.limit || 16
                            });
                            if (slice?.primary?.limit && slice?.primary?.limit > 0)
                                collections[handle].products.edges = collections[handle].products.edges.slice(
                                    0,
                                    slice?.primary?.limit
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
