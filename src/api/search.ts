import { Convertor } from './product';
import { PRODUCT_FRAGMENT } from './product';
import { ProductModel } from '../models/ProductModel';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const SearchApi = async (
    query: string = ''
): Promise<ProductModel[]> => {
    return new Promise(async (resolve, reject) => {
        if (!query) return reject();

        try {
            const { data } = await shopify.query({
                query: gql`
                {
                    products(first: 15, sortKey:BEST_SELLING, query: "${query}") {
                        edges {
                            node {
                                ${PRODUCT_FRAGMENT}
                            }
                        }
                    }
                }
                `
            });

            const result = data.products.edges.map((item) =>
                Convertor(item.node)
            );
            if (!result) return reject();

            return resolve(result);
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};
