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
        if (!query) return reject();

        try {
            const client = algoliasearch(
                'FTAWXDDQSS',
                '96091fe7865d3a9200303d82c12e3bfa'
            );

            const search = await client.search([
                {
                    indexName: 'products',
                    params: {
                        query
                    }
                },
                {
                    indexName: 'collections',
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
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};
