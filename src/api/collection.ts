import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { CollectionModel } from '../models/CollectionModel';
import { gql } from '@apollo/client';
import { newShopify } from './shopify';

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

export const Convertor = (collection: any): CollectionModel => {
    if (!collection) return null;

    const res = {
        id: collection?.id,
        handle: collection?.handle,
        is_brand:
            collection.isBrand?.value && collection.isBrand?.value == 'true'
                ? true
                : false,

        seo: {
            title: collection?.seo?.title || collection?.title,
            description:
                collection?.seo?.description || collection?.description || '',
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

        items: collection?.products?.edges?.map((product) =>
            ProductConvertor(product.node)
        )
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

export const BrandsApi = async (): Promise<CollectionModel[]> => {
    return new Promise(async (resolve, reject) => {
        const { data, errors } = await newShopify.query({
            query: gql`
                query collections {
                    collections(first: 250) {
                        edges {
                            node {
                                ${COLLECTION_FRAGMENT}
                            }
                        }
                    }
                }
            `
        });

        if (errors?.length) return reject(errors);

        return resolve(
            data.collections.edges
                .map((item) => Convertor(item.node))
                .filter((item) => item.is_brand)
        );
    });
};
