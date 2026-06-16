import 'server-only';

import { gql } from '@apollo/client';
import type { LimitFilters, Nullable } from '@nordcom/commerce-db';
import { ApiError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import type {
    Filter,
    ProductConnection,
    ProductEdge,
    ProductSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import { extractLimitLikeFilters } from '@/api/shopify/collection';
import { cache } from '@/cache';
import type { AbstractApi, ApiOptions } from '@/utils/abstract-api';
import { PRODUCT_CARD_FRAGMENT } from './queries';

/** Facet inputs compiled into a Shopify products-connection search query. */
export type ProductsQueryFacets = {
    available_for_sale?: boolean;
    vendor?: string;
    productType?: string;
    minPrice?: number;
    maxPrice?: number;
};

/**
 * Compiles facet inputs into a Shopify `products(query: …)` search string so the listing and its
 * page-count traversal apply the same constraints. Returns `null` when no facet is set (the
 * unfiltered catalog).
 *
 * @param facets - The selected facet inputs.
 * @returns The ` AND `-joined search query, or `null` when empty.
 */
export const buildProductsQueryString = (facets: ProductsQueryFacets): string | null => {
    const entries: string[] = [];
    if (facets.available_for_sale !== undefined) {
        entries.push(`available_for_sale:${facets.available_for_sale ? 'true' : 'false'}`);
    }
    if (facets.vendor) {
        entries.push(`vendor:"${facets.vendor}"`);
    }
    if (facets.productType) {
        entries.push(`product_type:"${facets.productType}"`);
    }
    if (typeof facets.minPrice === 'number' && Number.isFinite(facets.minPrice)) {
        entries.push(`variants.price:>=${facets.minPrice}`);
    }
    if (typeof facets.maxPrice === 'number' && Number.isFinite(facets.maxPrice)) {
        entries.push(`variants.price:<=${facets.maxPrice}`);
    }
    return entries.length > 0 ? entries.join(' AND ') : null;
};

const PRODUCTS_PAGINATION_COUNT_QUERY = graphql(`
    query productsPaginationCount(
        $first: Int
        $sorting: ProductSortKeys
        $query: String
        $before: String
        $after: String
    ) {
        products(first: $first, sortKey: $sorting, query: $query, before: $before, after: $after) {
            edges {
                cursor
                node {
                    id
                    vendor
                    productType
                    availableForSale
                    priceRange {
                        minVariantPrice {
                            amount
                        }
                    }
                }
            }
            pageInfo {
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
            }
        }
    }
`);

/** Facet data aggregated across the products-count traversal, used to synthesize the listing filters. */
type FacetAggregation = {
    vendors: Map<string, number>;
    productTypes: Map<string, number>;
    anyAvailable: boolean;
    minPrice: number;
    maxPrice: number;
};

/**
 * Synthesizes the `Filter[]` the listing UI consumes from facet data aggregated across the
 * products-count walk. The Storefront API only returns faceted `filters` for `Collection.products`
 * and `search`, never the root `products` connection, so the all-products page would otherwise have no
 * facets and its filter control stays disabled. Vendor and product-type groups carry per-value counts;
 * availability and price are emitted as control-only groups (the UI renders a checkbox and a min/max
 * range for those, ignoring `values`). Ids embed the substrings (`vendor`, `product_type`,
 * `availability`, `price`) the UI's `facetKind` classifier maps on.
 *
 * @param aggregation - Vendor/type counts, availability flag, and price bounds from the walk.
 * @returns The synthesized facet filters, omitting any group with no data.
 */
const buildFacetFilters = ({ vendors, productTypes, anyAvailable, minPrice, maxPrice }: FacetAggregation): Filter[] => {
    const filters: Filter[] = [];

    if (anyAvailable) {
        filters.push({ id: 'filter.v.availability', label: 'Availability', type: 'BOOLEAN', values: [] });
    }

    const toValues = (counts: Map<string, number>, prefix: string) =>
        [...counts.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, count]) => ({ id: `${prefix}.${label}`, label, count, input: '' }));

    const vendorValues = toValues(vendors, 'filter.p.vendor');
    if (vendorValues.length > 0) {
        filters.push({
            id: 'filter.p.vendor',
            label: 'Vendor',
            type: 'LIST',
            presentation: 'TEXT',
            values: vendorValues,
        });
    }

    const typeValues = toValues(productTypes, 'filter.p.product_type');
    if (typeValues.length > 0) {
        filters.push({
            id: 'filter.p.product_type',
            label: 'Product type',
            type: 'LIST',
            presentation: 'TEXT',
            values: typeValues,
        });
    }

    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
        filters.push({ id: 'filter.v.price', label: 'Price', type: 'PRICE_RANGE', values: [] });
    }

    return filters;
};

export type ProductsFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;

    sorting?: Nullable<ProductSortKeys>;
} & ProductsQueryFacets &
    LimitFilters;

export type ProductsOptions = ApiOptions & {
    filters: ProductsFilters;
};

/**
 * Counts all products matching the filters across pages and returns per-page cursor positions.
 *
 * @param options - Storefront API client and pagination/sorting constraints for the count traversal.
 * @param options.api - Storefront API client.
 * @param options.filters - Pagination and sorting constraints.
 * @returns Object with total `pages`, total `products`, `cursors` for cursor-based navigation, and the
 *   synthesized facet `filters` for the result set (the root `products` connection returns none).
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 */
export const ProductsPaginationCountApi = async ({
    api,
    ...props
}: ProductsOptions): Promise<{
    pages: number;
    products: number;
    cursors: string[];
    filters: Filter[];
}> => {
    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as ProductsFilters);
    const filtersTag = JSON.stringify(filters, null, 0);

    // Walk the catalog at Shopify's max page size instead of the grid's display size. Relay edge
    // cursors are position-stable across page sizes for a given sort key, so harvesting every
    // cursor from a wide walk reconstructs the narrow per-page boundaries while issuing ~7x fewer
    // serial round-trips (a 35/page display no longer forces ceil(N/35) blocking calls).
    const TRAVERSAL_PAGE_SIZE = 250;

    // Aggregated from the same walk so the synthesized facet filters cover the entire matching set,
    // not just the displayed page.
    const aggregation: FacetAggregation = {
        vendors: new Map<string, number>(),
        productTypes: new Map<string, number>(),
        anyAvailable: false,
        minPrice: Number.POSITIVE_INFINITY,
        maxPrice: Number.NEGATIVE_INFINITY,
    };

    const collectCursors = async (allCursors: string[] = [], after: string | null = null): Promise<string[]> => {
        const { data, errors } = await api.query(
            PRODUCTS_PAGINATION_COUNT_QUERY,
            {
                first: TRAVERSAL_PAGE_SIZE,
                query: buildProductsQueryString(filters),
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
        }

        const products = data?.products;
        const edges = products?.edges;
        if (!edges || edges.length <= 0) {
            return allCursors;
        }

        for (const edge of edges) {
            allCursors.push(edge.cursor ?? '');

            const node = edge.node;
            if (node.vendor) aggregation.vendors.set(node.vendor, (aggregation.vendors.get(node.vendor) ?? 0) + 1);
            if (node.productType) {
                aggregation.productTypes.set(
                    node.productType,
                    (aggregation.productTypes.get(node.productType) ?? 0) + 1,
                );
            }
            if (node.availableForSale) aggregation.anyAvailable = true;
            const price = Number(node.priceRange.minVariantPrice.amount);
            if (Number.isFinite(price)) {
                aggregation.minPrice = Math.min(aggregation.minPrice, price);
                aggregation.maxPrice = Math.max(aggregation.maxPrice, price);
            }
        }

        if (products.pageInfo.hasNextPage) {
            return collectCursors(allCursors, edges.at(-1)?.cursor ?? '');
        }

        return allCursors;
    };

    const flatCursors = await collectCursors();
    const products = flatCursors.length;

    const perPage = ((extractLimitLikeFilters(filters) as { first?: number })?.first || 30) as number;
    const pagesCeil = Math.ceil(products / perPage);
    const pages = pagesCeil - 1; // Subtract 1 because we're using `after` cursors.

    // The grid asks for `after: cursors[page - 2]`; slice the boundary cursor that starts each page
    // after the first out of the flat walk (one per page that has a next page).
    const cursors: string[] = [];
    for (let page = 1; page < pagesCeil; page++) {
        cursors.push(flatCursors[page * perPage - 1] ?? '');
    }

    return {
        pages,
        cursors,
        products,
        filters: buildFacetFilters(aggregation),
    };
};

/**
 * Fetches products from the Shopify API.
 *
 * @param options - The options.
 * @param options.api - The AbstractApi to use.
 * @param options.filters - Pagination, sorting, and filtering constraints.
 * @param [options.filters.limit=35] - The limit of products to fetch.
 * @param [options.filters.sorting='BEST_SELLING'] - The sorting to use.
 * @param [options.filters.available_for_sale=true] - Whether to include available for sale products, set to `undefined` to disable.
 * @param [options.filters.reverse] - Whether to reverse the order of the products.
 * @param [options.filters.vendor] - The vendor to use.
 * @param [options.filters.before] - The cursor to use for pagination.
 * @param [options.filters.after] - The cursor to use for pagination.
 * @returns The products.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {ApiError} When the Storefront API response is missing page info.
 */
export const ProductsPaginationApi = async ({
    api,
    filters: {
        limit = 35,
        sorting = 'BEST_SELLING',
        available_for_sale,
        reverse,
        vendor,
        productType,
        minPrice,
        maxPrice,
        before,
        after,
    },
}: {
    api: AbstractApi;
    filters: {
        limit?: number;
        vendor?: string;
        productType?: string;
        minPrice?: number;
        maxPrice?: number;
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
    const filter = {
        query: buildProductsQueryString({ available_for_sale, vendor, productType, minPrice, maxPrice }),
        sorting: sorting || null,
        reverse: typeof reverse !== 'undefined' ? (reverse ? 'true' : 'false') : null,
    };

    const { data, errors } = await api.query<{ products: ProductConnection }>(
        gql`
                    fragment ProductFragment on Product {
                        ${PRODUCT_CARD_FRAGMENT}
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
