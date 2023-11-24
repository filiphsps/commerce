import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product';
import type { AbstractApi, ApiOptions, Identifiable, Nullable } from '@/utils/abstract-api';
import { cache, cleanShopifyHtml } from '@/utils/abstract-api';
import { GenericError, NotFoundError, TodoError, UnknownApiError } from '@/utils/errors';
import type {
    CollectionEdge,
    CollectionSortKeys,
    ProductCollectionSortKeys,
    QueryRoot
} from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

/** @todo TODO: Type-library this so we can use it in other places. */
type LimitFilters = { limit?: Nullable<number> } | { first?: Nullable<number>; last?: Nullable<number> };

type GenericCollectionFilters = {
    after?: Nullable<string>;
    before?: Nullable<string>;
};
type CollectionFilters = {
    sorting?: Nullable<ProductCollectionSortKeys>;
} & GenericCollectionFilters &
    LimitFilters;
type CollectionsFilters = {
    sorting?: Nullable<CollectionSortKeys>;

    /**
     * @deprecated
     */
    vendor?: Nullable<string>;
} & GenericCollectionFilters &
    LimitFilters;

const extractLimitLikeFilters = (
    filters: LimitFilters,
    defaultLimit = 30
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
    switch (true) {
        case filters === null || typeof filters === 'undefined':
        case typeof (filters as any).limit !== 'number' &&
            typeof (filters as any).first !== 'number' &&
            typeof (filters as any).last !== 'number':
        case !('limit' in filters) && !('first' in filters) && !('last' in filters):
            return {
                first: defaultLimit
            };

        case 'limit' in filters:
            if ('first' in filters || 'last' in filters) {
                throw new TodoError(); // TODO: Add ErrorCode and Error for this.
            }
            return {
                first: filters.limit || defaultLimit
            };

        case 'first' in filters || 'last' in filters:
            if (typeof filters.first === 'number' && typeof filters.last === 'number') {
                throw new TodoError(); // TODO: Add ErrorCode and Error for this.
            }
            return {
                first: filters.first || null,
                last: filters.last || null
            };
    }

    // This should never actually be reachable.
    throw new GenericError('Supposedly unreachable code path was reached');
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
 * @note We modify the descriptionHtml to remove all non-breaking spaces
 *       and replace them with normal spaces.
 *
 * @todo TODO: Support `id` as an alternative to `handle` {@link https://shopify.dev/docs/api/storefront/2023-10/queries/collection}.
 *
 * @param {CollectionOptions} options - The options for the collection.
 * @param {AbstractApi} options.api - The API to use.
 * @param {string} options.handle - The handle of the collection to fetch.
 * @param {CollectionFilters} [options.filters] - The filters to apply to the collection.
 * @returns {Promise<Collection>} The collection.
 */
export const CollectionApi = cache(async ({ api, handle, ...props }: CollectionOptions) => {
    if (!handle) throw new Error('400: Invalid handle');

    const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionFilters);

    try {
        const { data, errors } = await api.query<{
            collection: QueryRoot['collection'];
        }>(
            gql`
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
                            title
                            description
                            descriptionHtml
                            image {
                                id
                                altText
                                url
                                height
                                width
                            }
                            seo {
                                title
                                description
                            }
                            products(
                                first: $first
                                last: $last
                                sortKey: $sorting
                                before: $before
                                after: $after
                            ) {
                                edges {
                                    node {
                                        ${PRODUCT_FRAGMENT_MINIMAL}
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
            {
                handle: handle,
                ...extractLimitLikeFilters(filters),
                ...(({ sorting = 'COLLECTION_DEFAULT', before = null, after = null }) => ({
                    sorting: sorting,
                    before: before,
                    after: after
                }))(filters)
            }
        );

        if (errors) {
            throw new UnknownApiError();
        } else if (!data?.collection) {
            throw new NotFoundError(`"Collection" with the handle "${handle}"`);
        }

        return {
            ...data.collection,
            descriptionHtml: cleanShopifyHtml(data.collection.descriptionHtml) || undefined
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
});

export const CollectionsApi = async (
    options:
        | {
              api: AbstractApi;
          }
        | {
              /**
               * @deprecated Use `api` instead.
               */
              client: AbstractApi;
          }
): Promise<
    Array<{
        id: string;
        handle: string;
        hasProducts: boolean;
    }>
> => {
    return new Promise(async (resolve, reject) => {
        const api = 'api' in options ? options.api : /** @deprecated */ options.client;

        const { data, errors } = await api.query<{ collections: QueryRoot['collections'] }>(gql`
            query collections($language: LanguageCode!, $country: CountryCode!)
            @inContext(language: $language, country: $country) {
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

        if (errors) return reject(new Error(`500: ${errors.map((e: any) => e.message).join('\n')}`));
        else if (!data?.collections) return reject(new Error(`404: No collections could be found`));

        return resolve(
            data.collections.edges.map(({ node: { id, handle, products } }) => ({
                id,
                handle,
                hasProducts: products?.edges ? products.edges.length > 0 : false
            }))
        );
    });
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
export const CollectionsPaginationApi = cache(
    async ({
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
        const filters = 'filters' in props ? props.filters : /** @deprecated */ (props as CollectionsFilters);

        return new Promise(async (resolve, reject) => {
            try {
                const { data } = await api.query<{ collections: QueryRoot['collections'] }>(
                    gql`
                        query collections(
                            $first: Int
                            $last: Int
                            $sorting: CollectionSortKeys
                            $query: String
                            $before: String
                            $after: String
                        ) {
                            collections(
                                first: $first
                                last: $last
                                sortKey: $sorting
                                query: $query
                                before: $before
                                after: $after
                            ) {
                                edges {
                                    cursor
                                    node {
                                        id
                                        handle
                                        createdAt
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
                    `,
                    {
                        ...extractLimitLikeFilters(filters),
                        ...(({ vendor = null, sorting = 'RELEVANCE', before = null, after = null }) => ({
                            query: vendor && `query:"vendor:${vendor}"`,
                            sorting: sorting,
                            before: before,
                            after: after
                        }))(filters)
                    }
                );

                const page_info = data?.collections.pageInfo;
                if (!page_info) return reject(new Error(`500: Something went wrong on our end`));

                return resolve({
                    collections: data.collections?.edges || [],
                    page_info: {
                        start_cursor: page_info.startCursor || null,
                        end_cursor: page_info.endCursor || null,
                        has_next_page: page_info.hasNextPage,
                        has_prev_page: page_info.hasPreviousPage
                    }
                });
            } catch (error: unknown) {
                console.error(error);
                return reject(error);
            }
        });
    }
);
