import type { Locale } from '@/utils/locale';
import { PRODUCT_FRAGMENT_MINIMAL, ProductVisualsApi } from './product';

import { storefrontClient } from '@/api/shopify';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

export const CollectionApi = async ({
    handle,
    locale,
    limit
}: {
    handle: string;
    locale: Locale;
    limit?: number;
}): Promise<Collection> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('400: Invalid handle'));

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query collection($handle: String!, $limit: Int!, $language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
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
                variables: {
                    handle: handle,
                    limit: limit || 250,
                    language: locale.language,
                    country: locale.country
                }
            });

            if (errors)
                return reject(
                    new Error(`500: Something wen't wrong on our end (${errors.map((e) => e.message).join('\n')})`)
                );
            if (!data?.collectionByHandle) return reject(new Error('404: The requested document cannot be found'));

            data.collectionByHandle.products.edges = await Promise.all(
                data.collectionByHandle.products.edges.map(async (edge: any) => {
                    if (edge.node.visuals?.value) {
                        edge.node.visualsData = await ProductVisualsApi({
                            id: edge.node.visuals.value,
                            locale
                        });
                        return edge;
                    }

                    return edge;
                })
            );

            data.collectionByHandle.descriptionHtml = data.collectionByHandle.descriptionHtml
                .replaceAll(/ /g, ' ')
                .replaceAll('\u00A0', ' ');
            return resolve(/*flattenConnection(*/ data.collectionByHandle /*)*/);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const CollectionsApi = async ({
    locale
}: {
    locale: Locale;
}): Promise<
    Array<{
        id: string;
        handle: string;
    }>
> => {
    return new Promise(async (resolve, reject) => {
        // TODO: Pagination.
        const { data, errors } = await storefrontClient.query({
            query: gql`
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
            `,
            variables: {
                language: locale.language,
                country: locale.country
            }
        });

        if (errors) return reject(`500: ${new Error(errors.map((e: any) => e.message).join('\n'))}`);

        return resolve(data.collections.edges.map((item: any) => item.node));
    });
};
