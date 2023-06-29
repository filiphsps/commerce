import * as Sentry from '@sentry/nextjs';

import {
    Collection,
    CountryCode,
    LanguageCode
} from '@shopify/hydrogen-react/storefront-api-types';
import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { CollectionModel } from '../models/CollectionModel';
import { gql } from '@apollo/client';
import { i18n } from '../../next-i18next.config.cjs';
import { storefrontClient } from './shopify';

export const COLLECTION_FRAGMENT = `
    id
    handle
    title
    description
    descriptionHtml
    image {
        id
        altText
        originalSrc
        height
        width
    }
    seo {
        title
        description
    }
    products(first: 250) {
        edges {
            node {
                ${PRODUCT_FRAGMENT}
            }
        }
    }
    keywords: metafield(namespace: "store", key: "keywords") {
        value
    }
    isBrand: metafield(namespace: "store", key: "is_brand") {
        value
    }
`;

export const Convertor = (collection: any): CollectionModel | null => {
    if (!collection) return null;

    const res = {
        id: collection?.id,
        handle: collection?.handle,
        is_brand: collection.isBrand?.value && collection.isBrand?.value == 'true' ? true : false,

        seo: {
            title: collection?.seo?.title || collection?.title,
            description: collection?.seo?.description || collection?.description || '',
            keywords: collection?.keywords?.value || ''
        },

        title: collection?.title,
        body: collection?.descriptionHtml,
        image: collection?.image
            ? {
                  id: collection?.image?.id,
                  alt: collection?.image?.altText ?? null,
                  src: collection?.image?.originalSrc,
                  height: collection?.image?.height,
                  width: collection?.image?.width
              }
            : null,

        items: collection?.products?.edges?.map((product) => ProductConvertor(product.node))
    };
    return res as any as CollectionModel;
};

export const CollectionApi = async ({
    handle,
    locale
}: {
    handle: string;
    locale?: string;
}): Promise<Collection> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('Invalid handle'));

        if (locale === 'x-default') locale = i18n.locales[1];

        const country = (
            locale?.split('-')[1] || i18n.locales[1].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || i18n.locales[1].split('-')[0]
        ).toUpperCase() as LanguageCode;

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query collection($handle: String!) @inContext(language: ${language}, country: ${country}) {
                        collectionByHandle(handle: $handle) {
                            ${COLLECTION_FRAGMENT}
                        }
                    }
                `,
                variables: {
                    handle: handle
                }
            });

            if (errors) return reject(new Error(errors.join('\n')));
            if (!data?.collectionByHandle)
                return reject(new Error('404: The requested document cannot be found'));

            return resolve(/*flattenConnection(*/ data.collectionByHandle /*)*/);
        } catch (error) {
            Sentry.captureException(error);
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

        return resolve(data.collections.edges.map((item) => item.node));
    });
};
