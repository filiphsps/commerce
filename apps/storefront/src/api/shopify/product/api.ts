import 'server-only';

import { gql } from '@apollo/client';
import type { Identifiable } from '@nordcom/commerce-db';
import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
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
        cursor: data.products.edges.at(-1)!.cursor,
        pagination: {
            next: data.products.pageInfo.hasNextPage,
            previous: data.products.pageInfo.hasPreviousPage,
        },
    };
};
