import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { trace } from '@opentelemetry/api';

import type { Product, ProductFilters } from '@/api/product';
import type { AbstractApi } from '@/utils/abstract-api';

const SEARCH_PRODUCTS_QUERY = graphql(`
    query searchProducts($query: String!, $first: Int, $type: [SearchType!]) {
        search(query: $query, first: $first, types: $type) {
            totalCount
            productFilters {
                id
                label
                presentation
                type
                values {
                    id
                    label
                    count
                    input
                    swatch {
                        color
                    }
                }
            }
            edges {
                node {
                    ... on Product {
                        id
                        handle
                        title
                        vendor
                        productType
                        availableForSale
                        trackingParameters
                        featuredImage {
                            id
                            url(transform: { preferredContentType: WEBP })
                            altText
                            width
                            height
                        }
                        images(first: 1) {
                            edges {
                                node {
                                    id
                                    url(transform: { preferredContentType: WEBP })
                                    altText
                                    width
                                    height
                                }
                            }
                        }
                        tags
                        priceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                            maxVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    }
`);

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
    totalCount: number;
}> => {
    if (!query) {
        return { products: [], productFilters: [], totalCount: 0 };
    }

    const search = async ({ type }: { type: 'PRODUCT' }) => {
        const { data, errors } = await client.query(SEARCH_PRODUCTS_QUERY, {
            query,
            type: [type],
            first: limit || 75,
        });

        // Without surfacing `errors` a Shopify failure (rate limit, invalid
        // query syntax, transient 5xx) collapses to "no results" — visually
        // identical to a legitimate empty result, so users get a broken
        // search experience with nothing in the logs to explain it.
        if (errors && errors.length > 0) {
            trace.getActiveSpan()?.addEvent('shopify.search_query_errors', {
                'error.message': String(errors),
                'search.query': query,
            });
        }

        return {
            result: data?.search.edges.map((item) => item.node as unknown as Product) || [],
            productFilters: data?.search.productFilters || [],
            totalCount: data?.search.totalCount ?? 0,
        };
    };

    const { result: products, productFilters, totalCount } = await search({ type: 'PRODUCT' });
    return { products, productFilters, totalCount };
};
