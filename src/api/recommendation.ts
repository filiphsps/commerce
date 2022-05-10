import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const RecommendationApi = async (id: string) => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject();

        try {
            const { data } = await shopify.query({
                query: gql`
                fragment product on Product {
                    ${PRODUCT_FRAGMENT}
                }
                query recommendations($id: ID!) {
                    productRecommendations(productId: $id) {
                        ...product
                    }
                }
                `,
                variables: {
                    id
                }
            });

            const result = data?.productRecommendations?.map((product) =>
                ProductConvertor(product)
            );
            if (!result) return reject();

            resolve(result);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
