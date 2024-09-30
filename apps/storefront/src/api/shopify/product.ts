import type { Identifiable, LimitFilters, Nullable } from '@nordcom/commerce-db';
import { ApiError, InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';

import { extractLimitLikeFilters } from '@/api/shopify/collection';
import { cleanShopifyHtml } from '@/utils/abstract-api';
import { gql } from '@apollo/client';
import md5 from 'crypto-js/md5';

import type { Product } from '@/api/product';
import type { AbstractApi, ApiOptions } from '@/utils/abstract-api';
import type {
    Filter,
    Maybe,
    ProductConnection,
    ProductEdge,
    ProductSortKeys,
    QueryRoot
} from '@shopify/hydrogen-react/storefront-api-types';

export const PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS = /* GraphQL */ `
    id
    handle
    availableForSale
    createdAt
    title
    description
    vendor
    productType
    tags
    trackingParameters
    seo {
        title
        description
    }
    priceRange {
        maxVariantPrice {
            amount
            currencyCode
        }
        minVariantPrice {
            amount
            currencyCode
        }
    }
`;

export const PRODUCT_FRAGMENT_MINIMAL = /* GraphQL */ `
    ${PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS}

    options(first: 3) {
        id
        name
        values
    }
    variants(first: 3) {
        edges {
            node {
                id
                title
                barcode
                price {
                    amount
                    currencyCode
                }
                compareAtPrice {
                    amount
                    currencyCode
                }
                availableForSale
                currentlyNotInStock
                quantityAvailable
                weight
                weightUnit
                image {
                    id
                    altText
                    url(transform: { preferredContentType: WEBP })
                    height
                    width
                }
                selectedOptions {
                    name
                    value
                }
            }
        }
    }
    featuredImage {
        id
        altText
        url(transform: { preferredContentType: WEBP })
        height
        width
    }
    images(first: 5) {
        edges {
            node {
                id
                altText
                url(transform: { preferredContentType: WEBP })
                height
                width
            }
        }
    }
`;

export const PRODUCT_FRAGMENT = /* GraphQL */ `
    id
    handle
    availableForSale
    createdAt
    updatedAt
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    trackingParameters
    totalInventory
    seo {
        title
        description
    }
    priceRange {
        maxVariantPrice {
            amount
            currencyCode
        }
        minVariantPrice {
            amount
            currencyCode
        }
    }
    options(first: 250) {
        id
        name
        values
    }
    variants(first: 250) {
        edges {
            node {
                id
                sku
                title
                barcode
                price {
                    amount
                    currencyCode
                }
                compareAtPrice {
                    amount
                    currencyCode
                }
                availableForSale
                weight
                weightUnit
                image {
                    id
                    altText
                    url(transform: { preferredContentType: WEBP })
                    height
                    width
                }
                selectedOptions {
                    name
                    value
                }

                quantityBreaks: metafield(namespace: "nordcom-commerce", key: "quantity_breaks") {
                    id
                    namespace
                    reference {
                        ... on Metaobject {
                            handle
                            steps: field(key: "steps") {
                                references(first: 25) {
                                    edges {
                                        node {
                                            ... on Metaobject {
                                                minimumQuantity: field(key: "minimum_quantity") {
                                                    value
                                                }
                                                value: field(key: "value") {
                                                    value
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    featuredImage {
        id
        altText
        url(transform: { preferredContentType: WEBP })
        height
        width
    }
    images(first: 250) {
        edges {
            node {
                id
                altText
                url(transform: { preferredContentType: WEBP })
                height
                width
            }
        }
    }

    originalName: metafield(namespace: "store", key: "original-name") {
        id
        namespace
        value
        type
    }

    nutritionalContent: metafield(namespace: "store", key: "nutritional_content") {
        id
        namespace
        value
        type
    }

    ingredients: metafield(namespace: "store", key: "ingredients") {
        id
        namespace
        value
        type
    }
    flavors: metafield(namespace: "store", key: "flavors") {
        id
        namespace
        value
        type
    }

    allergen: metafield(namespace: "shopify", key: "allergen-information") {
        id
        namespace
        value
        type
    }
    rating: metafield(namespace: "reviews", key: "rating") {
        id
        namespace
        value
        type
    }
    ratingCount: metafield(namespace: "reviews", key: "rating_count") {
        id
        namespace
        value
        type
    }
`;

type ProductsFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;

    sorting?: Nullable<ProductSortKeys>;
} & LimitFilters;

type ProductOptions = ApiOptions &
    Identifiable & {
        /** GraphQL */
        fragment?: string;
    };
type ProductsOptions = ApiOptions & {
    filters: ProductsFilters;
};

export const ProductApi = async ({ api, handle, fragment }: ProductOptions): Promise<Product> => {
    if (!handle) {
        throw new InvalidHandleError(handle);
    }

    const shop = api.shop();

    try {
        const { data, errors } = await api.query<{ product: Maybe<Product> }>(
            gql`
                query product($handle: String!) {
                    product(handle: $handle) {
                        ${fragment?.trim() ?? PRODUCT_FRAGMENT}
                    }
                }
            `,
            {
                handle
            },
            {
                tags: [`product`, handle, ...(fragment ? [md5(fragment).toString()] : [])]
            }
        );

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        } else if (!data?.product?.handle) {
            throw new NotFoundError(`"Product" with the handle "${handle}" on shop "${shop.id}"`);
        }

        const {
            product: { descriptionHtml, ...product }
        } = data;
        return {
            ...product,
            descriptionHtml: cleanShopifyHtml(descriptionHtml) || ''
        } as Product;
    } catch (error: unknown) {
        console.error(error);
        throw error;
    }
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
        const { data, errors } = await api.query<{
            products: QueryRoot['products'];
        }>(
            gql`
                query products($first: Int, $sorting: ProductSortKeys, $before: String, $after: String) {
                    products(first: $first, sortKey: $sorting, before: $before, after: $after) {
                        edges {
                            cursor
                            node {
                                id
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
            `,
            {
                ...extractLimitLikeFilters(filters),
                ...(({ sorting = 'BEST_SELLING' }) => ({
                    sorting: sorting,
                    after: after
                }))(filters)
            },
            {
                tags: ['products', 'pagination', 'count', ...(filtersTag ? [filtersTag] : [])]
            }
        );

        if (errors) {
            throw new ProviderFetchError(errors);
        } else if (!data?.products.edges || data.products.edges.length <= 0) {
            return {
                count,
                cursors
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
            cursors
        };
    };

    try {
        const { count: products, cursors } = await countProducts(0);

        const perPage = ((extractLimitLikeFilters(filters) as any)?.first || 30) as number;
        const pages = Math.ceil(products / perPage) - 1; // Subtract 1 because we're using `after` cursors.
        return {
            pages,
            cursors: cursors.reverse(),
            products
        };
    } catch (error: unknown) {
        throw error;
    }
};

export const ProductsApi = async ({
    api,
    limit = 250,
    sorting = 'BEST_SELLING',
    cursor
}: {
    api: AbstractApi;
    limit?: number;
    sorting?: ProductSortKeys;
    cursor?: string;
}): Promise<{
    products: ProductEdge[];
    cursor?: string;
    pagination: {
        next: boolean;
        previous: boolean;
    };
}> => {
    const shop = api.shop();

    try {
        const { data, errors } = await api.query<{ products: ProductConnection }>(
            gql`
                fragment ProductFragment on Product {
                    ${PRODUCT_FRAGMENT}
                }

                query products($limit: Int!, $sorting: ProductSortKeys, $cursor: String) {
                    products(
                        first: $limit,
                        sortKey: $sorting,
                        after: $cursor
                    )
                    {
                        edges {
                            cursor
                            node {
                                ...ProductFragment
                            }
                        }
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                    }
                }
            `,
            {
                limit,
                sorting: (sorting as any) || null,
                cursor: (cursor as any) || null
            },
            {
                tags: ['products']
            }
        );

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        } else if (!data?.products.edges || data.products.edges.length <= 0) {
            throw new NotFoundError(`"Product" on shop "${shop.id}"`);
        }

        return {
            products: data.products.edges,
            cursor: data.products.edges.at(-1)!.cursor,
            pagination: {
                next: data.products.pageInfo.hasNextPage,
                previous: data.products.pageInfo.hasPreviousPage
            }
        };
    } catch (error: unknown) {
        throw error;
    }
};

/**
 * Fetches products from the Shopify API.
 *
 * @param {object} options - The options.
 * @param {AbstractApi} options.api - The AbstractApi to use.
 * @param {object} options.filters - The AbstractApi to use.
 * @param {number} [options.filters.limit=35] - The limit of products to fetch.
 * @param {ProductSortKeys} [options.filters.sorting='BEST_SELLING'] - The sorting to use.
 * @param {boolean} [options.filters.available_for_sale=true] - Whether to include available for sale products, set to `undefined` to disable.
 * @param {boolean} [options.filters.reverse] - Whether to reverse the order of the products.
 * @param {string} [options.filters.vendor] - The vendor to use.
 * @param {string} [options.filters.before] - The cursor to use for pagination.
 * @param {string} [options.filters.after] - The cursor to use for pagination.
 * @returns {Promise<ProductEdge[]>} The products.
 */
export const ProductsPaginationApi = async ({
    api,
    filters: { limit = 35, sorting = 'BEST_SELLING', available_for_sale, reverse, vendor, before, after }
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
    try {
        let queryEntries = [];
        if (available_for_sale !== undefined) {
            queryEntries.push(`available_for_sale:${available_for_sale ? 'true' : 'false'}`);
        }
        if (vendor) {
            queryEntries.push(`vendor:"${vendor}"`);
        }

        const filter = {
            query: queryEntries.length > 0 ? queryEntries.join(' AND ') : null,
            sorting: (sorting as any) || null,
            reverse: typeof reverse !== 'undefined' ? (reverse ? 'true' : 'false') : null
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
                before: (before as any) || null,
                after: (after as any) || null,
                ...filter
            },
            {
                ...(Object.keys(filter).length > 0 ? { fetchPolicy: 'no-cache' } : {})
            }
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
                has_prev_page: page_info.hasPreviousPage
            },
            products: ((data.products.edges as any) || []) as ProductEdge[],
            filters: data.products.filters
        };
    } catch (error: unknown) {
        throw error;
    }
};
