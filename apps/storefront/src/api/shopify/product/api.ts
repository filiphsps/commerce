import 'server-only';

import { gql } from '@apollo/client';
import type { Identifiable } from '@nordcom/commerce-db';
import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { trace } from '@opentelemetry/api';
import type {
    Maybe,
    ProductConnection,
    ProductEdge,
    ProductSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import md5 from 'crypto-js/md5';
import type { Product } from '@/api/product';
import { cache } from '@/cache';
import type { AbstractApi, ApiOptions, ApiReturn } from '@/utils/abstract-api';
import { PRODUCT_FRAGMENT } from './queries';

type ProductOptions = ApiOptions &
    Identifiable & {
        /** GraphQL */
        fragment?: string;
    };

// Handles-only listing. Projects nothing but `node.handle` so build-time
// warmers (the PDP `generateStaticParams`) can enumerate the best sellers
// without dragging in the heavy PDP payload `ProductsApi` carries — variants,
// images, options, and the per-variant/product metafields are all irrelevant
// when the caller only reads handle strings.
const PRODUCT_HANDLES_QUERY = graphql(`
    query productHandles($first: Int!, $sorting: ProductSortKeys) {
        products(first: $first, sortKey: $sorting) {
            edges {
                node {
                    handle
                }
            }
        }
    }
`);

/**
 * Fetches a single product from the Shopify Storefront API by handle.
 *
 * @param options - Storefront API client, product handle, and optional GraphQL fragment override.
 * @param options.api - Storefront API client.
 * @param options.handle - Product handle to fetch.
 * @param options.fragment - Optional GraphQL fragment string to override the default product fields.
 * @returns A result tuple — `[Product, undefined]` on success or `[undefined, error]` on failure.
 */
export const ProductApi = async ({ api, handle, fragment }: ProductOptions): Promise<ApiReturn<Product>> => {
    if (!handle) {
        return [undefined, new InvalidHandleError(handle)];
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
                handle,
            },
            {
                tags: [
                    ...cache.keys.product({ tenant: api.shop(), handle }).tags,
                    'product',
                    handle,
                    ...(fragment ? [md5(fragment).toString()] : []),
                ],
            },
        );

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        } else if (!data?.product?.handle) {
            throw new NotFoundError(`"Product" with the handle "${handle}" on shop "${shop.id}"`);
        }

        return [
            {
                ...data.product,
                descriptionHtml: data.product.descriptionHtml ?? '',
            } as Product,
            undefined,
        ];
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('shopify.product_query_failed', {
            'error.message': (error as Error)?.message ?? String(error),
            'product.handle': handle,
            'shop.id': shop.id,
        });
        return [undefined, error instanceof Error ? error : new Error(String(error))];
    }
};

/**
 * Fetches a paginated list of products from the Shopify Storefront API.
 *
 * @param options - Storefront API client and pagination parameters; controls page size, sort key, and cursor position.
 * @param options.api - Storefront API client.
 * @param options.limit - Max products per page; defaults to `250`.
 * @param options.sorting - Product sort key; defaults to `"BEST_SELLING"`.
 * @param options.cursor - Pagination cursor for the next page.
 * @returns Object with `products` edges, next `cursor`, and `pagination` flags.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When no products are returned.
 */
export const ProductsApi = async ({
    api,
    limit = 250,
    sorting = 'BEST_SELLING',
    cursor,
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
            sorting: sorting || null,
            cursor: cursor || null,
        },
        {
            tags: [...cache.keys.products({ tenant: api.shop() }).tags, 'products'],
        },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if (!data?.products.edges || data.products.edges.length <= 0) {
        throw new NotFoundError(`"Product" on shop "${shop.id}"`);
    }

    return {
        products: data.products.edges,
        cursor: data.products.edges.at(-1)?.cursor ?? '',
        pagination: {
            next: data.products.pageInfo.hasNextPage,
            previous: data.products.pageInfo.hasPreviousPage,
        },
    };
};

/**
 * Fetches only the handles of a shop's products, sorted so the warmest PDPs
 * come first. Backs the PDP build-time warmer: it reads just `node.handle`, so
 * enumerating the top sellers costs a single lean round-trip instead of the
 * full {@link ProductsApi} PDP payload (variants, images, metafields).
 *
 * @param options - Storefront API client and listing constraints.
 * @param options.api - Storefront API client carrying the explicit `{ shop, locale }` tenant context.
 * @param options.limit - Max handles to fetch; defaults to `5`.
 * @param options.sorting - Product sort key; defaults to `"BEST_SELLING"` so the best sellers are returned first.
 * @returns The product handles, in the requested sort order.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When the shop has no products.
 */
export const ProductHandlesApi = async ({
    api,
    limit = 5,
    sorting = 'BEST_SELLING',
}: {
    api: AbstractApi;
    limit?: number;
    sorting?: ProductSortKeys;
}): Promise<string[]> => {
    const shop = api.shop();
    const { data, errors } = await api.query(
        PRODUCT_HANDLES_QUERY,
        {
            first: limit,
            sorting,
        },
        {
            tags: [...cache.keys.products({ tenant: shop }).tags, 'products'],
        },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if (!data?.products.edges || data.products.edges.length <= 0) {
        throw new NotFoundError(`"Product" on shop "${shop.id}"`);
    }

    return data.products.edges.map(({ node: { handle } }) => handle);
};
