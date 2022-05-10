import { ProductModel } from '../models/ProductModel';
import TitleToHandle from '../util/TitleToHandle';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const PRODUCT_FRAGMENT = `
    id
    handle
    title
    description
    vendor
    productType
    images(first: 250) {
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

    let body = {};
    if (metafields['body'] && metafields['language']) {
        const bodies = JSON.parse(metafields['body']);
        const languages = JSON.parse(metafields['language']);

        languages?.forEach((language, index) => {
            body[language] = bodies[index]?.html;
        });
    }

    let details = [
        metafields['strength'] && {
            title: {
                en_US: 'Strength',
                de_DE: 'Sträke'
            },
            value: metafields['strength'] && `${metafields['strength']}/5`
        },
        metafields['flavor'] && {
            title: {
                en_US: 'Flavor',
                de_DE: 'Flavor'
            },
            value: metafields['flavor']
        },
        metafields['nicotine'] && {
            title: {
                en_US: 'Nicotine',
                de_DE: 'Nikotin'
            },
            value: metafields['nicotine'] && `${metafields['nicotine']}mg/g`
        },
        metafields['size'] && {
            title: {
                en_US: 'Size',
                de_DE: 'Grösse'
            },
            value: metafields['size']
        },
        metafields['can_tobacco_weight'] && {
            title: {
                en_US: 'Weight/Can',
                de_DE: 'Inhalt/Dose'
            },
            value:
                metafields['can_tobacco_weight'] &&
                `${metafields['can_tobacco_weight']}g`
        },
        metafields['moisture'] && {
            title: {
                en_US: 'Moisture',
                de_DE: 'Feuchtigkeit'
            },
            value: metafields['moisture'] && `${metafields['moisture']}%`
        }
    ]?.filter((a) => a);

    return {
        id: product?.id,
        handle: product?.handle,

        title: product?.title,
        description: product?.description,
        body,
        type: product?.productType,

        vendor: {
            title: product?.vendor,
            handle: TitleToHandle(product?.vendor)
        },

        variants: product?.variants?.edges?.map((variant, index) => ({
            id: variant?.node?.id,
            available: variant?.node?.availableForSale,
            title: variant?.node?.title,
            type: product?.productType,
            image: 0, //index

            price: variant?.node?.price,
            compare_at_price: variant?.node?.compareAtPrice,
            ...((variant) => {
                const title = `${variant?.title}`?.split(' / ')[0];

                let items = 1;
                switch (title) {
                    case 'can':
                    case 'dose':
                    case 'regular':
                        items = 1;
                        break;
                    case 'roll':
                    case 'stange':
                    case '1 roll':
                        items = 10;
                        break;
                    case '3 rolls':
                    case '3 stangen':
                    case '3 roll':
                        items = 30;
                        break;
                    case '6 rolls':
                    case '6 stangen':
                    case '6 roll':
                        items = 60;
                        break;
                    case '12 rolls':
                    case '12 stangen':
                    case '12 roll':
                        items = 120;
                        break;
                    case '24 rolls':
                    case '24 stangen':
                    case '24 roll':
                        items = 240;
                        break;
                }

                return {
                    items,
                    from_price: variant?.price,
                    compare_at_from_price: variant?.compareAtPrice,
                    price_per_item: variant?.price / items
                };
            })(variant?.node)
        })),
        images: product?.images?.edges?.map((image) => ({
            src: image?.node?.transformedSrc,
            alt: image?.node?.altText
        })),

        metadata: metafields,
        details
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
