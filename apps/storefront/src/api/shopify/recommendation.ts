import { InvalidIDError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';

import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product';
import { gql } from '@apollo/client';
import { parseGid } from '@shopify/hydrogen-react';

import type { Product } from '@/api/product';
import type { AbstractApi } from '@/utils/abstract-api';

// TODO: Migrate to the new recommendations api.
export const RecommendationApi = async ({ api, id }: { api: AbstractApi; id: string }): Promise<Product[]> => {
    const gid = parseGid(id);
    if (!gid.id) {
        throw new InvalidIDError(id);
    }

    const shop = api.shop();

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

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        }
        if (!data?.productRecommendations || data.productRecommendations.length <= 0) {
            throw new NotFoundError(`"Recommendations" for "Product" with id "${id}" on shop "${shop.id}"`);
        }

        return data.productRecommendations;
    } catch (error: unknown) {
        throw error;
    }
};
