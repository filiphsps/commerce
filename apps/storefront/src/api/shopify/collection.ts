import type { Identifiable, LimitFilters, Nullable } from '@nordcom/commerce-db';
import {
    InvalidHandleError,
    NotFoundError,
    ProviderFetchError,
    TodoError,
    UnreachableError,
} from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import type {
    Collection,
    CollectionEdge,
    CollectionSortKeys,
    ProductCollectionSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product-fragments';
import { cache } from '@/cache';
import type { AbstractApi, ApiOptions } from '@/utils/abstract-api';
import { isValidHandle } from '@/utils/handle';

const COLLECTION_QUERY = graphql(
    `
    query collection(
        $handle: String!
        $first: Int
        $last: Int
        $sorting: ProductCollectionSortKeys
        $before: String
        $after: String
    ) {
        collection(handle: $handle) {
            id
            handle
            updatedAt
            title
            description
            descriptionHtml
            image {
                id
                altText
                url
                height
                width
                thumbhash
            }
            seo {
                title
                description
            }
            products(first: $first, last: $last, sortKey: $sorting, before: $before, after: $after) {
                edges {
                    node {
                        ...ProductMinimal
                    }
                }
                pageInfo {
                    startCursor
                    endCursor
                    hasNextPage
                    hasPreviousPage
                }
            }
            keywords: metafield(namespace: "store", key: "keywords") {
                value
            }
            isBrand: metafield(namespace: "store", key: "is_brand") {
                value
            }
            shortDescription: metafield(namespace: "store", key: "short_description") {
                value
            }
        }
    }
`,
    [PRODUCT_FRAGMENT_MINIMAL],
);

const COLLECTION_PAGINATION_COUNT_QUERY = graphql(`
    query collectionPaginationCount(
        $handle: String!
        $first: Int
        $sorting: ProductCollectionSortKeys
        $before: String
        $after: String
    ) {
        collection(handle: $handle) {
            id
            handle
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
    }
`);

const COLLECTIONS_QUERY = graphql(`
    query collections {
        collections(first: 250) {
            edges {
                node {
                    id
                    handle
                    products(first: 1) {
                        edges {
                            node {
                                id
                            }
                        }
                    }
                }
            }
        }
    }
`);

const COLLECTIONS_PAGINATION_QUERY = graphql(`
    query collectionsPagination(
        $first: Int
        $last: Int
        $sorting: CollectionSortKeys
        $before: String
        $after: String
    ) {
        collections(first: $first, last: $last, sortKey: $sorting, before: $before, after: $after) {
            edges {
                cursor
                node {
                    id
                    handle
                    updatedAt
                    title
                    description
                    descriptionHtml
                    image {
                        id
                        altText
                        url
                        height
                        width
                        thumbhash
                    }
                    seo {
                        title
                        description
                    }
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
`);

type GenericCollectionFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;
};
export type CollectionFilters = {
    sorting?: Nullable<ProductCollectionSortKeys>;
} & GenericCollectionFilters &
    LimitFilters;
type CollectionsFilters = {
    sorting?: Nullable<CollectionSortKeys>;
} & GenericCollectionFilters &
    LimitFilters;

// TODO: This should be generic.
export const extractLimitLikeFilters = (
    filters: LimitFilters,
    defaultLimit = 30,
):
    | {
          first: number;
      }
    | {
          last: number;
      }
    | {
          first: number;
          last: number;
      }
    | {} => {
    const f = filters as Record<string, unknown>;
    switch (true) {
        case filters === null || typeof filters === 'undefined':
        case typeof f.limit !== 'number' && typeof f.first !== 'number' && typeof f.last !== 'number':
        case !('limit' in filters) && !('first' in filters) && !('last' in filters):
            return {
                first: defaultLimit,
            };

        case 'limit' in filters:
            if ('first' in filters || 'last' in filters) {
                throw new TodoError(); // TODO: Add ErrorCode and Error for this.
            }
            return {
                first: filters.limit || defaultLimit,
            };

        case 'first' in filters || 'last' in filters:
            if (typeof filters.first === 'number' && typeof filters.last === 'number') {
                throw new TodoError(); // TODO: Add ErrorCode and Error for this.
            }
            return {
                first: filters.first || null,
                last: filters.last || null,
            };
    }

    // This should never actually be reachable.
    throw new UnreachableError();
};

type CollectionOptions = ApiOptions &
    Identifiable &
    (
        | {
              filters: CollectionFilters;
          }
        | /** @deprecated */ CollectionFilters
    );

/**
 * Get a collection from Shopify.
 *
 * @todo TODO: Support `id` as an alternative to `handle` {@link https://shopify.dev/docs/api/storefront/2024-07/queries/collection}.
 *
 * @param options - The options for the collection.
 * @param options.api - The API to use.
 * @param options.handle - The handle of the collection to fetch.
 * @param [options.filters] - The filters to apply to the collection.
 * @returns The collection.
 */
export const CollectionApi = async (
    { api, handle, ...props }: CollectionOptions,
    _cache?: unknown,
): Promise<Collection> => {
    if (!isValidHandle(handle)) {
        throw new InvalidHandleError(handle);
    }

    const shop = api.shop();

    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionFilters);
    const filtersTag = JSON.stringify(filters, null, 0);
    const { data, errors } = await api.query(
        COLLECTION_QUERY,
        {
            handle,
            ...extractLimitLikeFilters(filters),
            ...(({ sorting = 'COLLECTION_DEFAULT', before = null, after = null }) => ({
                sorting,
                before,
                after,
            }))(filters),
        },
        {
            tags: [
                ...cache.keys.collection({ tenant: api.shop(), handle }).tags,
                'collection',
                handle,
                ...(filtersTag ? [filtersTag] : []),
            ],
        },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if (!data?.collection) {
        throw new NotFoundError(`"Collection" with the handle "${handle}" on shop "${shop.id}"`);
    }

    return {
        ...(data.collection as unknown as Collection),
        descriptionHtml: data.collection.descriptionHtml ?? '',
    };
};

export const CollectionPaginationCountApi = async ({
    api,
    handle,
    ...props
}: CollectionOptions): Promise<{
    pages: number;
    products: number;
    cursors: string[];
}> => {
    if (!isValidHandle(handle)) {
        throw new InvalidHandleError(handle);
    }

    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionFilters);
    const filtersTag = JSON.stringify(filters, null, 0);

    const countProducts = async (count: number = 0, cursors: string[] = [], after: string | null = null) => {
        const { data, errors } = await api.query(
            COLLECTION_PAGINATION_COUNT_QUERY,
            {
                handle,
                ...extractLimitLikeFilters(filters),
                ...(({ sorting = 'COLLECTION_DEFAULT' }) => ({
                    sorting,
                    after,
                }))(filters),
            },
            {
                tags: [
                    ...cache.keys.collection({ tenant: api.shop(), handle }).tags,
                    'collection',
                    handle,
                    'pagination',
                    'count',
                    ...(filtersTag ? [filtersTag] : []),
                ],
            },
        );

        if (errors && errors.length > 0) {
            throw new ProviderFetchError(errors);
        } else if (!data?.collection?.products.edges || data.collection.products.edges.length <= 0) {
            return {
                count,
                cursors,
            };
        }

        const cursor = data.collection.products.edges.at(-1)!.cursor;
        if (data.collection.products.pageInfo.hasNextPage) {
            const res = await countProducts(count, [cursor, ...cursors], cursor);

            count += res.count;
            cursors = res.cursors;
        }

        return {
            count: count + data.collection.products.edges.length,
            cursors,
        };
    };
    const { count: products, cursors } = await countProducts(0);

    const perPage = ((extractLimitLikeFilters(filters) as { first?: number })?.first || 30) as number;
    const pages = Math.ceil(products / perPage);
    return {
        pages,
        cursors: cursors.reverse(),
        products,
    };
};

export const CollectionsApi = async ({
    api,
}: {
    api: AbstractApi;
}): Promise<
    Array<{
        id: string;
        handle: string;
        hasProducts: boolean;
    }>
> => {
    const { data, errors } = await api.query(COLLECTIONS_QUERY, undefined, {
        tags: [...cache.keys.collections({ tenant: api.shop() }).tags, 'collections'],
    });

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    } else if (!data?.collections) {
        throw new NotFoundError(`"Collections" cannot be found`);
    }

    return data.collections.edges.map(({ node: { id, handle, products } }) => ({
        id,
        handle,
        hasProducts: products.edges.length > 0,
    }));
};

type CollectionsOptions = ApiOptions &
    (
        | {
              filters: CollectionsFilters;
          }
        | /** @deprecated */ CollectionsFilters
    );

/**
 * Fetches collections from the Shopify API.
 */
export const CollectionsPaginationApi = async ({
    api,
    ...props
}: CollectionsOptions): Promise<{
    page_info: {
        start_cursor: string | null;
        end_cursor: string | null;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    collections: CollectionEdge[];
}> => {
    const shop = api.shop();
    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionsFilters);

    const { data, errors } = await api.query(
        COLLECTIONS_PAGINATION_QUERY,
        {
            ...extractLimitLikeFilters(filters),
            ...(({ sorting = 'RELEVANCE', before = null, after = null }) => ({
                sorting,
                before,
                after,
            }))(filters),
        },
        {
            tags: [...cache.keys.collections({ tenant: api.shop() }).tags, 'collections', 'pagination'],
        },
    );

    // The previous code destructured only `{ data }` and ignored `errors`
    // entirely. With Apollo's `errorPolicy: 'all'`, Shopify can return a
    // partial-success payload (`data` + `errors`) — we'd happily render the
    // partial result and the missing collections would silently disappear
    // from prod, masked as "empty list".
    if (errors && errors.length > 0) {
        console.error(`[shopify] CollectionsPaginationApi errors for shop ${shop.id}:`, errors);
        throw new ProviderFetchError(
            `"Collections" query on shop "${shop.id}": ${errors
                .map((e) => (e instanceof Error ? e.message : undefined))
                .filter((e) => e)
                .join(', ')}`,
        );
    }

    const page_info = data?.collections.pageInfo;
    if (!page_info) {
        throw new ProviderFetchError(`"Collections.pageInfo" on shop "${shop.id}"`);
    }

    return {
        collections: data.collections.edges as unknown as CollectionEdge[],
        page_info: {
            start_cursor: page_info.startCursor || null,
            end_cursor: page_info.endCursor || null,
            has_next_page: page_info.hasNextPage,
            has_prev_page: page_info.hasPreviousPage,
        },
    };
};
