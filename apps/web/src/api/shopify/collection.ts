import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product';
import type {
    Collection,
    CollectionConnection,
    CollectionEdge,
    CollectionSortKeys
} from '@shopify/hydrogen-react/storefront-api-types';

import type { AbstractApi } from '@/utils/abstract-api';
import { gql } from 'graphql-tag';

/**
 * Get a collection from Shopify.
 * NOTE: We modify the descriptionHtml to remove all non-breaking spaces
 *       and replace them with normal spaces.
 */
export const CollectionApi = async ({
    api,
    handle,
    limit
}: {
    api: AbstractApi;
    handle: string;
    limit?: number;
}): Promise<Collection> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('400: Invalid handle'));

        try {
            const { data, errors } = await api.query<{ collectionByHandle: Collection }>(
                gql`
                    query collection($handle: String!, $limit: Int!) {
                        collectionByHandle(handle: $handle) {
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
                            products(first: $limit) {
                                edges {
                                    node {
                                        ${PRODUCT_FRAGMENT_MINIMAL}
                                    }
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
                    limit: limit || 250
                }
            );

            if (errors)
                return reject(
                    new Error(`500: Something went wrong on our end (${errors.map((e) => e.message).join('\n')})`)
                );
            if (!data?.collectionByHandle)
                return reject(new Error(`404: "Collection" with handle "${handle}" cannot be found`));

            return resolve({
                ...data.collectionByHandle,
                descriptionHtml: (data.collectionByHandle.descriptionHtml || '')
                    .replaceAll(/ /g, ' ')
                    .replaceAll('\u00A0', ' ')
            });
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const CollectionsApi = async ({
    client
}: {
    client: AbstractApi;
}): Promise<
    Array<{
        id: string;
        handle: string;
    }>
> => {
    return new Promise(async (resolve, reject) => {
        // TODO: Pagination.
        const { data, errors } = await client.query<{ collections: CollectionConnection }>(gql`
            query collections($language: LanguageCode!, $country: CountryCode!)
            @inContext(language: $language, country: $country) {
                collections(first: 250) {
                    edges {
                        node {
                            id
                            handle
                        }
                    }
                }
            }
        `);

        if (errors) return reject(new Error(`500: ${errors.map((e: any) => e.message).join('\n')}`));
        else if (!data?.collections) return reject(new Error(`404: No collections could be found`));

        return resolve(data.collections.edges.map((item: any) => item.node));
    });
};

/**
 * Fetches collections from the Shopify API.
 */
export const CollectionsPaginationApi = async ({
    api,
    limit = 35,
    sorting = 'RELEVANCE',
    vendor,
    before,
    after
}: {
    api: AbstractApi;
    limit?: number;
    vendor?: string;
    sorting?: CollectionSortKeys;
    before?: string | null;
    after?: string | null;
}): Promise<{
    page_info: {
        start_cursor: string | null;
        end_cursor: string | null;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    collections: CollectionEdge[];
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await api.query<{ collections: CollectionConnection }>(
                gql`
                    query collections(
                        $limit: Int!
                        $sorting: CollectionSortKeys
                        $query: String
                        $before: String
                        $after: String
                    ) {
                        collections(first: $limit, sortKey: $sorting, query: $query, before: $before, after: $after) {
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
                    limit,
                    query: (vendor && `query:"vendor:${vendor}"`) || null,
                    sorting: sorting || null,
                    before: before || null,
                    after: after || null
                }
            );

            const page_info = data?.collections.pageInfo;
            if (!page_info) return reject(new Error(`500: Something went wrong on our end`));

            return resolve({
                page_info: {
                    start_cursor: page_info.startCursor || null,
                    end_cursor: page_info.endCursor || null,
                    has_next_page: page_info.hasNextPage,
                    has_prev_page: page_info.hasPreviousPage
                },
                collections: data.collections?.edges || []
            });
        } catch (error: any) {
            console.error(error);
            return reject(error);
        }
    });
};
