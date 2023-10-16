import { NextLocaleToCountry, NextLocaleToLanguage } from '@/utils/Locale';
import { PRODUCT_FRAGMENT_MINIMAL, ProductVisualsApi } from './product';

import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { Config } from '@/utils/Config';
import { gql } from 'graphql-tag';
import { storefrontClient } from '@/api/shopify';

export const CollectionApi = async ({
    handle,
    locale,
    limit
}: {
    handle: string;
    locale?: string;
    limit?: number;
}): Promise<Collection> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('400: Invalid handle'));

        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const country = NextLocaleToCountry(locale);
        const language = NextLocaleToLanguage(locale);

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query collection($handle: String!, $limit: Int!) @inContext(language: ${language}, country: ${country}) {
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
                    limit: limit || 250
                }
            });

            if (errors) return reject(new Error(errors.join('\n')));
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

export const CollectionsApi = async (): Promise<
    Array<{
        id: string;
        handle: string;
    }>
> => {
    return new Promise(async (resolve, reject) => {
        const { data, errors } = await storefrontClient.query({
            query: gql`
                query collections {
                    collections(first: 250) {
                        edges {
                            node {
                                id
                                handle
                            }
                        }
                    }
                }
            `
        });

        if (errors) return reject(new Error(errors.join('\n')));

        return resolve(data.collections.edges.map((item: any) => item.node));
    });
};
