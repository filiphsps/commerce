import * as Sentry from '@sentry/nextjs';

import TitleToHandle from '../util/TitleToHandle';
import { VendorModel } from '../models/VendorModel';
import algoliasearch from 'algoliasearch/lite';

export const SearchApi = async (
    query: string = ''
): Promise<{
    products: Array<{
        id: string;
        handle: string;
        title: string;
        vendor: VendorModel;
        image: string;
    }>;
    collections: Array<{
        id: string;
        handle: string;
        title: string;
        image?: string;
    }>;
}> => {
    return new Promise(async (resolve, reject) => {
        if (!query) return reject(new Error('TODO:'));

        try {
            const client = algoliasearch('K6GKG8PPW8', '4b66d1e9840c871fc80eac49b6ca35fd');

            const search = await client.search([
                {
                    indexName: 'shopify_products',
                    params: {
                        query
                    }
                },
                {
                    indexName: 'shopify_collections',
                    params: {
                        query
                    }
                }
            ]);

            const res = search.results;
            const products = res[0].hits.map((item) => ({
                id: item.objectID,
                handle: (item as any).handle,
                title: (item as any).title,
                vendor: {
                    title: (item as any).vendor,
                    handle: TitleToHandle((item as any).vendor)
                },
                image: (item as any).image
            }));
            const collections = res[1].hits.map((item) => ({
                id: item.objectID,
                handle: (item as any).handle,
                title: (item as any).title,
                image: (item as any).image
            }));

            return resolve({
                products,
                collections
            });
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
