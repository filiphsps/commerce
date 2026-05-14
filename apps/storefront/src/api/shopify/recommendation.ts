import { gql } from '@apollo/client';
import { InvalidIDError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { parseGid } from '@shopify/hydrogen-react';
import type { Product } from '@/api/product';
import { cache } from '@/cache';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product';
import type { AbstractApi } from '@/utils/abstract-api';

// TODO: Migrate to the new recommendations api.
export const RecommendationApi = async ({ api, id }: { api: AbstractApi; id: string }): Promise<Product[]> => {
    const gid = parseGid(id);
    if (!gid.id) {
        throw new InvalidIDError(id);
    }

    const shop = api.shop();
    const { data, errors } = await api.query<{ productRecommendations: Product[] }>(
        gql`
                query productRecommendations($productId: ID!) {
                    productRecommendations(productId: $productId, intent: RELATED) {
                        ${PRODUCT_FRAGMENT_MINIMAL}
                    }
                }
            `,
        {
            productId: id,
        },
        { tags: [...cache.keys.product({ tenant: shop, handle: gid.id }).tags, 'recommendations'] },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    }
    if (!data?.productRecommendations || data.productRecommendations.length <= 0) {
        throw new NotFoundError(`"Recommendations" for "Product" with id "${id}" on shop "${shop.id}"`);
    }

    return data.productRecommendations;
};
