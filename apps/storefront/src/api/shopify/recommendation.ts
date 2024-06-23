import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product';
import { gql } from '@apollo/client';

import type { Product } from '@/api/product';
import type { AbstractApi } from '@/utils/abstract-api';

// TODO: Migrate to the new recommendations api.
export const RecommendationApi = async ({ api, id }: { api: AbstractApi; id: string }): Promise<Product[]> => {
    return new Promise(async (resolve, reject) => {
        // TODO: Use `parseGid` from `@shopify/hydrogen-react` to validate the id.
        if (!id || !id.includes('gid://shopify')) return reject(new Error('Invalid ID'));

        try {
            const { data, errors } = await api.query<{ productRecommendations: Product[] }>(
                gql`
                    query productRecommendations($productId: ID!) {
                        productRecommendations(productId: $productId, intent: RELATED) {
                            ${PRODUCT_FRAGMENT_MINIMAL}
                        }
                    }
                `,
                {
                    productId: id
                }
            );

            if (errors) return reject(new Error(`500: ${errors.map((i) => i.message).join('\n')}`));
            if (!data?.productRecommendations)
                return reject(new Error(`404: No recommendations found for "Product" with id "${id}"`));

            return resolve(/*flattenConnection(*/ data.productRecommendations /*)*/);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};
