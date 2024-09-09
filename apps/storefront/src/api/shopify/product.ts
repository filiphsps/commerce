import type { Identifiable, LimitFilters, Nullable } from '@nordcom/commerce-db';
import { NotFoundError, UnknownApiError } from '@nordcom/commerce-errors';

import { extractLimitLikeFilters } from '@/api/shopify/collection';
import { cleanShopifyHtml } from '@/utils/abstract-api';
import { gql } from '@apollo/client';

import type { Product } from '@/api/product';
import type { AbstractApi, ApiOptions } from '@/utils/abstract-api';
import type {
    Maybe,
    ProductConnection,
    ProductEdge,
    ProductSortKeys,
    QueryRoot
} from '@shopify/hydrogen-react/storefront-api-types';

export const PRODUCT_FRAGMENT_MINIMAL = `
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
    options(first: 3) {
        id
        name
        values
    }
    sellingPlanGroups(first: 3) {
        edges {
            node {
                name
            }
        }
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

export const PRODUCT_FRAGMENT = `
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
    sellingPlanGroups(first: 250) {
        edges {
            node {
                appName
                name
                options {
                    name,
                    values
                }
            }
        }
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
`;

type ProductsFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;

    sorting?: Nullable<ProductSortKeys>;
} & LimitFilters;

type ProductOptions = ApiOptions & Identifiable;
type ProductsOptions = ApiOptions & {
    filters: ProductsFilters;
};

export const ProductApi = async ({ api, handle }: ProductOptions): Promise<Product> => {
    if (!handle) throw new Error('400: Invalid handle');

    const shop = api.shop();

    try {
        const { data, errors } = await api.query<{ product: Maybe<Product> }>(
            gql`
                    query product($handle: String!) {
                        product(handle: $handle) {
                            ${PRODUCT_FRAGMENT}
                        }
                    }
                `,
            {
                handle
            },
            {
                tags: [`product`, handle]
            }
        );

        if ((errors || []).length > 0) {
            throw new UnknownApiError();
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
    filters
    //...props
}: ProductsOptions): Promise<{
    pages: number;
    products: number;
    cursors: string[];
}> => {
    const countProducts = async (count: number = 0, cursors: string[] = [], after: string | null = null) => {
        const filtersTag = JSON.stringify(filters, null, 0);

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
                            hasNextPage
                        }
                    }
                }
            `,
            {
                ...extractLimitLikeFilters(filters),
                ...(({ sorting = 'BEST_SELLING' }) => ({
                    sorting: sorting,
                    //before: before,
                    after: after
                }))(filters)
            },
            {
                tags: [`products`, 'pagination', ...(filtersTag ? [filtersTag] : [])]
            }
        );

        if (errors) throw new UnknownApiError();
        else if (!data?.products.edges || data.products.edges.length <= 0)
            return {
                count,
                cursors
            };

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
        const pages = Math.ceil(products / perPage);
        return {
            pages,
            cursors: cursors.reverse(),
            products
        };
    } catch (error: unknown) {
        console.error(error);
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
    return new Promise(async (resolve, reject) => {
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

            if (errors)
                return reject(
                    new Error(`500: Something went wrong on our end (${errors.map((e) => e.message).join('\n')})`)
                );
            if (!data?.products.edges) return reject(new Error(`404: No products could be found`));

            return resolve({
                products: data.products.edges,
                cursor: data.products.edges.at(-1)!.cursor,
                pagination: {
                    next: data.products.pageInfo.hasNextPage,
                    previous: data.products.pageInfo.hasPreviousPage
                }
            });
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

/**
 * Fetches products from the Shopify API.
 *
 * @param {object} options - The options.
 * @param {AbstractApi} options.api - The AbstractApi to use.
 * @param {number} [options.limit=35] - The limit of products to fetch.
 * @param {ProductSortKeys} [options.sorting='BEST_SELLING'] - The sorting to use.
 * @param {string} [options.vendor] - The vendor to use.
 * @param {string} [options.before] - The cursor to use for pagination.
 * @param {string} [options.after] - The cursor to use for pagination.
 * @returns {Promise<ProductEdge[]>} The products.
 */
export const ProductsPaginationApi = async ({
    api,
    limit = 35,
    sorting = 'BEST_SELLING',
    vendor,
    before,
    after
}: {
    api: AbstractApi;
    limit?: number;
    vendor?: string;
    sorting?: ProductSortKeys;
    before?: string | null;
    after?: string | null;
}): Promise<{
    page_info: {
        start_cursor: string | null;
        end_cursor: string | null;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    products: ProductEdge[];
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await api.query<{ products: ProductConnection }>(
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
                        }
                    }
                `,
                {
                    limit,
                    query: (vendor && `query:"vendor:${vendor}"`) || null,
                    sorting: (sorting as any) || null,
                    before: (before as any) || null,
                    after: (after as any) || null
                },
                {
                    tags: ['products', 'pagination']
                }
            );

            const page_info = data?.products.pageInfo;
            if (!page_info) return reject(new Error(`500: Something went wrong on our end`));

            return resolve({
                page_info: {
                    start_cursor: page_info.startCursor || null,
                    end_cursor: page_info.endCursor || null,
                    has_next_page: page_info.hasNextPage,
                    has_prev_page: page_info.hasPreviousPage
                },
                products: ((data.products.edges as any) || []) as ProductEdge[]
            });
        } catch (error: unknown) {
            console.error(error);
            return reject(error);
        }
    });
};
