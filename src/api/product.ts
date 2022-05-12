import { ProductModel } from '../models/ProductModel';
import TitleToHandle from '../util/TitleToHandle';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const PRODUCT_FRAGMENT = `
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    images(first: 5) {
        edges {
            node {
                altText
                transformedSrc
            }
        }
    }
    variants(first: 250) {
        edges {
            node {
                id
                title
                price
                compareAtPrice
                availableForSale
                weight
                weightUnit
            }
        }
    }
    metafields(first: 250) {
        edges {
            node {
                id
                key
                namespace
                value
            }
        }
    }
`;

export const Convertor = (product: any): ProductModel => {
    if (!product) return null;

    let metafields = {};
    product?.metafields?.edges?.forEach((metafield) => {
        metafields[metafield?.node?.key] = metafield?.node?.value;
    });

    return {
        id: product?.id,
        handle: product?.handle,

        title: product?.title,
        description: product?.description,
        body: product?.descriptionHtml,
        type: product?.productType,
        tags: product?.tags,

        vendor: {
            title: product?.vendor,
            handle: TitleToHandle(product?.vendor)
        },

        variants: product?.variants?.edges?.map((variant, index) => ({
            id: variant?.node?.id,
            available: variant?.node?.availableForSale,
            type: product?.productType,
            image: 0, //index

            price: variant?.node?.price,
            compare_at_price: variant?.node?.compareAtPrice,
            ...((variant) => {
                let items = 1;
                let title = variant?.title;
                // TODO: handle packages here

                if (title.toLowerCase().endsWith('g')) {
                    let weight = Number.parseInt(title.replace('g', ''));

                    // Convert g to oz
                    weight *= 0.035274;

                    // Round to one decimal
                    weight = Math.round(weight * 10) / 10;

                    title += ` (${weight}oz)`;
                }

                return {
                    items,
                    title,
                    from_price: variant?.price,
                    compare_at_from_price: variant?.compareAtPrice
                };
            })(variant?.node)
        })),
        images: product?.images?.edges?.map((image) => ({
            src: image?.node?.transformedSrc,
            alt: image?.node?.altText
        })),

        metadata: metafields
    };
};

export const ProductApi = async (handle: string) => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject();

        try {
            const { data } = await shopify.query({
                query: gql`
                fragment product on Product {
                ${PRODUCT_FRAGMENT}
                }
                query product($handle: String!) {
                    productByHandle(handle: $handle) {
                        ...product
                    }
                }
                `,
                variables: {
                    handle
                }
            });

            const result = Convertor(data?.productByHandle);
            if (!result) return reject();

            resolve(result);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

export const ProductIdApi = async (id: string) => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject();

        try {
            const { data } = await shopify.query({
                query: gql`
                query getProduct($id: ID!) {
                    node(id: $id) {
                        ...on Product {
                            ${PRODUCT_FRAGMENT}
                        }
                    }
                }
                `,
                variables: {
                    id
                }
            });

            if (!data?.node) return reject();

            resolve(Convertor(data?.node));
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

export const ProductsApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await shopify.query({
                query: gql`
                fragment product on Product {
                ${PRODUCT_FRAGMENT}
                }
                query products {
                    products(first: 250, sortKey: BEST_SELLING) {
                        edges {
                            node {
                                ...product
                            }
                        }
                    }
                }
                `
            });

            const result = data?.products?.edges
                ?.map((product) => Convertor(product?.node))
                ?.filter((a) => a);
            if (!result) return reject();

            resolve(result);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
