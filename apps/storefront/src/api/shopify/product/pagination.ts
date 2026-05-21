import 'server-only';

import { gql } from '@apollo/client';
import type { LimitFilters, Nullable } from '@nordcom/commerce-db';
import { ApiError, ProviderFetchError } from '@nordcom/commerce-errors';
import type {
    Filter,
    ProductConnection,
    ProductEdge,
    ProductSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import { extractLimitLikeFilters } from '@/api/shopify/collection';
import { cache } from '@/cache';
import type { AbstractApi, ApiOptions } from '@/utils/abstract-api';
import { PRODUCT_FRAGMENT, PRODUCTS_PAGINATION_COUNT_QUERY } from './queries';

export type ProductsFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;

    sorting?: Nullable<ProductSortKeys>;
} & LimitFilters;

export type ProductsOptions = ApiOptions & {
    filters: ProductsFilters;
};

export const ProductsPaginationCountApi = async ({
    api,
    ...props
}: ProductsOptions): Promise<{
    pages: number;
    products: number;
    cursors: string[];
}> => {
    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as ProductsFilters);
    const filtersTag = JSON.stringify(filters, null, 0);

    const countProducts = async (count: number = 0, cursors: string[] = [], after: string | null = null) => {
        const { data, errors } = await api.query(
            PRODUCTS_PAGINATION_COUNT_QUERY,
            {
                ...extractLimitLikeFilters(filters),
                ...(({ sorting = 'BEST_SELLING' }) => ({
                    sorting,
                    after,
                }))(filters),
            },
            {
                tags: [
                    ...cache.keys.products({ tenant: api.shop() }).tags,
                    'products',
                    'pagination',
                    'count',
                    ...(filtersTag ? [filtersTag] : []),
                ],
            },
        );

        if (errors) {
            throw new ProviderFetchError(errors);
        } else if (!data?.products.edges || data.products.edges.length <= 0) {
            return {
                count,
                cursors,
            };
        }

        const cursor = data.products.edges.at(-1)!.cursor;
        if (data.products.pageInfo.hasNextPage) {
            const res = await countProducts(count, [cursor, ...cursors], cursor);

            count += res.count;
            cursors = res.cursors;
        }

        return {
            count: count + data.products.edges.length,
            cursors,
        };
    };
    const { count: products, cursors } = await countProducts(0);

    const perPage = ((extractLimitLikeFilters(filters) as { first?: number })?.first || 30) as number;
    const pages = Math.ceil(products / perPage) - 1; // Subtract 1 because we're using `after` cursors.
    return {
        pages,
        cursors: cursors.reverse(),
        products,
    };
};

/**
 * Fetches products from the Shopify API.
 *
 * @param options - The options.
 * @param options.api - The AbstractApi to use.
 * @param options.filters - The AbstractApi to use.
 * @param [options.filters.limit=35] - The limit of products to fetch.
 * @param [options.filters.sorting='BEST_SELLING'] - The sorting to use.
 * @param [options.filters.available_for_sale=true] - Whether to include available for sale products, set to `undefined` to disable.
 * @param [options.filters.reverse] - Whether to reverse the order of the products.
 * @param [options.filters.vendor] - The vendor to use.
 * @param [options.filters.before] - The cursor to use for pagination.
 * @param [options.filters.after] - The cursor to use for pagination.
 * @returns The products.
 */
export const ProductsPaginationApi = async ({
    api,
    filters: { limit = 35, sorting = 'BEST_SELLING', available_for_sale, reverse, vendor, before, after },
}: {
    api: AbstractApi;
    filters: {
        limit?: number;
        vendor?: string;
        sorting?: ProductSortKeys;
        available_for_sale?: boolean;
        reverse?: boolean;
        before?: string | null;
        after?: string | null;
    };
}): Promise<{
    page_info: {
        start_cursor: string | null;
        end_cursor: string | null;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    products: ProductEdge[];
    filters: Filter[];
}> => {
    const queryEntries = [];
    if (available_for_sale !== undefined) {
        queryEntries.push(`available_for_sale:${available_for_sale ? 'true' : 'false'}`);
    }
    if (vendor) {
        queryEntries.push(`vendor:"${vendor}"`);
    }

    const filter = {
        query: queryEntries.length > 0 ? queryEntries.join(' AND ') : null,
        sorting: sorting || null,
        reverse: typeof reverse !== 'undefined' ? (reverse ? 'true' : 'false') : null,
    };

    const { data, errors } = await api.query<{ products: ProductConnection }>(
        gql`
                    fragment ProductFragment on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query products($limit: Int!, $sorting: ProductSortKeys, $query: String, $before: String, $after: String) {
                        products(
                            first: $limit,
                            sortKey: $sorting,
                            query: $query,
                            before: $before,
                            after: $after
                        )
                        {
                            edges {
                                cursor
                                node {
                                    ...ProductFragment
                                }
                            }
                            pageInfo {
                                startCursor
                                endCursor
                                hasNextPage
                                hasPreviousPage
                            }
                            filters {
                                id
                                label
                                presentation
                                type
                                values {
                                    count
                                    id
                                    input
                                    label
                                    swatch {
                                        color
                                    }
                                }
                            }
                        }
                    }
                `,
        {
            limit,
            before: before || null,
            after: after || null,
            ...filter,
        },
        {
            ...(Object.keys(filter).length > 0 ? { fetchPolicy: 'no-cache' } : {}),
            tags: [...cache.keys.products({ tenant: api.shop() }).tags, 'products', 'pagination'],
        },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    }

    const page_info = data?.products.pageInfo;
    if (!page_info) {
        throw new ApiError("Shopify API didn't return a page info object");
    }

    return {
        page_info: {
            start_cursor: page_info.startCursor || null,
            end_cursor: page_info.endCursor || null,
            has_next_page: page_info.hasNextPage,
            has_prev_page: page_info.hasPreviousPage,
        },
        products: (data.products.edges || []) as ProductEdge[],
        filters: data.products.filters,
    };
};
