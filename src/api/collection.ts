import { PRODUCT_FRAGMENT, Convertor as ProductConvertor } from './product';

import { CollectionModel } from '../models/CollectionModel';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const COLLECTION_FRAGMENT = `
    id
    handle
    title
    description
    products(first: 250) {
        edges {
            node {
                ${PRODUCT_FRAGMENT}
            }
        }
    }
`;

export const Convertor = (collection: any): CollectionModel => {
    if (!collection) return null;

    return {
        id: collection?.id,
        handle: collection?.handle,

        title: collection?.title,
        body: collection?.description,

        items: collection?.products?.edges?.map((product) =>
            ProductConvertor(product.node)
        )
    };
};

export const CollectionApi = async (handle: string) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await shopify.query({
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

            resolve(result);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
