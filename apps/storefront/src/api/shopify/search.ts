import { gql } from '@apollo/client';
import type { SearchResultItemConnection } from '@shopify/hydrogen-react/storefront-api-types';

import type { Product, ProductFilters } from '@/api/product';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product';
import type { AbstractApi } from '@/utils/abstract-api';

export const SearchApi = async ({
    client,
    query,
    limit,
}: {
    client: AbstractApi;
    query: string;
    limit?: number;
}): Promise<{
    products: Product[];
    productFilters: ProductFilters;
}> => {
    if (!query) {
        return { products: [], productFilters: [] };
    }

    const search = async ({ type }: { type: 'PRODUCT' }) => {
        const { data, errors } = await client.query<{ search: SearchResultItemConnection }>(
            gql`
                query searchProducts(
                        $query: String!,
                        $first: Int,
                        $type: [SearchType!]) {

                    search(query: $query, first: $first, types: $type) {
                        productFilters {
                            id
                            label
                            type
                            values {
                                id
                                label
                                count
                                input
                            }
                        }
                        edges {
                            node {
                                ... on Product {
                                    ${PRODUCT_FRAGMENT_MINIMAL}
                                    trackingParameters
                                }
                            }
                        }
                    }
                }
            `,
            {
                query,
                type: type,
                first: limit || 75,
            },
        );

        // Without surfacing `errors` a Shopify failure (rate limit, invalid
        // query syntax, transient 5xx) collapses to "no results" — visually
        // identical to a legitimate empty result, so users get a broken
        // search experience with nothing in the logs to explain it.
        if (errors && errors.length > 0) {
            console.error('[shopify] SearchApi errors:', errors);
        }

        return {
            result: data?.search.edges.map((item) => item.node as unknown as Product) || [],
            productFilters: data?.search.productFilters || [],
        };
    };

    const { result: products, productFilters } = await search({ type: 'PRODUCT' });
    return { products, productFilters };
};
