import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { CollectionModel } from '../models/CollectionModel';
import { gql } from '@apollo/client';
import { newShopify } from './shopify';

const COLLECTION_PRODUCT_FRAGMENT = PRODUCT_FRAGMENT;
export const COLLECTION_FRAGMENT = `
    id
    handle
    title
    description
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
                ${COLLECTION_PRODUCT_FRAGMENT}
            }
        }
    }
    keywords: metafield(namespace: "store", key: "keywords") {
        value
    }
`;

export const Convertor = (collection: any): CollectionModel => {
    if (!collection) return null;

    const res = {
        id: collection?.id,
        handle: collection?.handle,

        seo: {
            title: collection?.seo?.title || collection?.title,
            description:
                collection?.seo?.description || collection?.description,
            keywords: collection?.keywords?.value || ''
        },

        title: collection?.title,
        body: collection?.description,
        image: collection?.image
            ? {
                  id: collection?.image?.id,
                  alt: collection?.image?.altText ?? null,
                  src: collection?.image?.originalSrc,
                  height: collection?.image?.height,
                  width: collection?.image?.width
              }
            : null,

        items: collection?.products?.edges
            ?.map((product) => ProductConvertor(product.node))
            .map((product) => ({
                id: product.id,
                handle: product.handle,
                title: product.title,
                vendor: product.vendor,
                images: product.images,
                pricing: product.pricing,
                variants: product.variants
            }))
    };
    return res;
};

export const CollectionApi = async (handle: string) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await newShopify.query({
                query: gql`
                fragment collection on Collection {
                    ${COLLECTION_FRAGMENT}
                }
                query collection($handle: String!) {
                    collectionByHandle(handle: $handle) {
                        ...collection
                    }
                }
                `,
                variables: {
                    handle: handle
                }
            });

            if (errors) throw errors;

            const result = Convertor(data?.collectionByHandle);
            if (!result) return reject(new Error('404'));

            return resolve(result);
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

export const CollectionsApi = async (): Promise<CollectionModel[]> => {
    return new Promise(async (resolve, reject) => {
        const { data, errors } = await newShopify.query({
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

        if (errors?.length) return reject(errors);

        return resolve(data.collections.edges.map((item) => item.node));
    });
};
