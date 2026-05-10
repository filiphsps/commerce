import { gql } from '@apollo/client';
import type { PredictiveSearchResult, SearchResultItemConnection } from '@shopify/hydrogen-react/storefront-api-types';

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
        const { data } = await client.query<{ search: SearchResultItemConnection }>(
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

        return {
            result: data?.search.edges.map((item) => item.node as unknown as Product) || [],
            productFilters: data?.search.productFilters || [],
        };
    };

    const { result: products, productFilters } = await search({ type: 'PRODUCT' });
    return { products, productFilters };
};

export const SearchPredictionApi = async ({
    client,
    query,
}: {
    client: AbstractApi;
    query: string;
}): Promise<PredictiveSearchResult | {}> => {
    if (!query) return {};

    const { data } = await client.query<{ predictiveSearch: PredictiveSearchResult }>(
        gql`
        query predictiveSearch($query: String!) {
            predictiveSearch(query: $query, types: [QUERY], limit: 5) {
                queries {
                    styledText
                    text
                }
            }
        }
    `,
        {
            query,
        },
    );

    return data?.predictiveSearch || {};
};
