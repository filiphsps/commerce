import { ProductModel } from '../models/ProductModel';
import { ProductVariantModel } from '../models/ProductVariantModel';
import { ShopifyWeightUnit } from '../models/WeightModel';
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
    seo {
        title
        description
    }
    priceRange {
        maxVariantPrice {
            amount
            currencyCode
        }
        minVariantPrice {
            amount
            currencyCode
        }
    }
    options(first: 250) {
        id
        name
        values
    }
    variants(first: 250) {
        edges {
            node {
                id
                title
                priceV2 {
                    amount
                    currencyCode
                }
                compareAtPriceV2 {
                    amount
                }
                availableForSale
                weight
                weightUnit
                image {
                    id
                }
                selectedOptions {
                    name
                    value
                }
            }
        }
    }
    images(first: 250) {
        edges {
            node {
                id
                altText
                originalSrc
                height
                width
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

    const images = product?.images.edges.map(({ node }) => ({
        id: atob(node.id),
        alt: node.altText ?? null,
        src: node.originalSrc,
        height: node.height,
        width: node.width
    }));

    return {
        id: atob(product?.id),
        handle: product?.handle,

        title: product?.title,
        description: product?.description,
        body: product?.descriptionHtml,
        type: product?.productType,
        tags: product?.tags,
        seo: {
            title: product?.seo?.title,
            description: product?.seo?.description
        },

        vendor: {
            title: product?.vendor,
            handle: TitleToHandle(product?.vendor)
        },

        pricing: {
            currency: product?.priceRange.maxVariantPrice.currencyCode,
            range: {
                min: Number.parseFloat(
                    product?.priceRange.minVariantPrice.amount
                ),
                max: Number.parseFloat(
                    product?.priceRange.maxVariantPrice.amount
                )
            }
        },
        options: product?.options.map((option) => ({
            id: option.name,
            title: option.name,
            type: 'multi_choice',
            default: option.values[0],
            values: option.values.map((value) => ({
                id: value,
                title: value
            }))
        })),
        variants: product?.variants.edges.map(
            ({ node: variant }): ProductVariantModel => {
                const imageId = atob(variant.image?.id);
                const defaultImage = images.findIndex(
                    (image) => image.id === imageId
                );

                // FIXME: do this in some weight component.
                let weight = {
                    value: null,
                    unit: null
                };
                switch (variant.weightUnit as ShopifyWeightUnit) {
                    case 'KILOGRAMS':
                        weight.value = variant.weight * 1000;
                        weight.unit = 'g';
                        break;
                    case 'GRAMS':
                        weight.value = variant.weight;
                        weight.unit = 'g';
                        break;
                    case 'POUNDS':
                        weight.value = variant.weight * 16;
                        weight.unit = 'oz';
                        break;
                    case 'OUNCES':
                        weight.value = variant.weight;
                        weight.unit = 'oz';
                        break;
                    default:
                        throw new Error(
                            `Invalid weight unit "${variant.weightUnit}"`
                        );
                }

                return {
                    id: atob(variant.id),
                    title: variant.title,
                    sku: '',
                    default_image: defaultImage ?? 0,
                    pricing: {
                        currency: variant.priceV2.currencyCode,
                        range: variant.priceV2.amount,
                        compare_at_range:
                            variant.compareAtPriceV2?.amount || null
                    },
                    options: variant.selectedOptions.map(({ name, value }) => ({
                        id: name,
                        value
                    })),
                    weight,
                    available: variant.availableForSale
                };
            }
        ),
        images,
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

            return resolve(result);
        } catch (err) {
            console.error(err);
            return reject(err);
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
                    id: btoa(id)
                }
            });

            if (!data?.node) return reject();

            return resolve(Convertor(data?.node));
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

export const ProductsCountApi = async (): Promise<number> => {
    const count_products = async (count: number = 0, cursor?: string) => {
        const { data } = await shopify.query({
            query: gql`
                query products {
                    products(
                        first: 250,
                        sortKey: BEST_SELLING
                        ${cursor ? `, after: "${cursor}"` : ''})
                    {
                        edges {
                            cursor
                            node {
                                id
                            }
                        }
                        pageInfo {
                            hasNextPage
                        }
                    }
                }
            `
        });

        if (data.products.pageInfo.hasNextPage)
            count += await count_products(
                count,
                data.products.edges.at(-1).cursor
            );

        return count + data.products.edges.length;
    };

    const count = await count_products();
    return count;
};

export const ProductsApi = async (
    limit: number = 250,
    cursor?: string
): Promise<{
    products: ProductModel[];
    cursor?: string;
    pagination: {
        next: boolean;
        previous: boolean;
    };
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await shopify.query({
                query: gql`
                fragment product on Product {
                    ${PRODUCT_FRAGMENT}
                }
                query products {
                    products(
                        first: ${limit},
                        sortKey: BEST_SELLING
                        ${cursor ? `, after: "${cursor}"` : ''}) 
                    {
                        edges {
                            cursor
                            node {
                                ...product
                            }
                        }
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                    }
                }
                `
            });

            const result = data?.products?.edges
                ?.map((product) => Convertor(product?.node))
                ?.filter((a) => a);
            if (!result) return reject();

            return resolve({
                products: result,
                cursor: data.products.edges.at(-1).cursor,
                pagination: {
                    next: data.products.pageInfo.hasNextPage,
                    previous: data.products.pageInfo.hasPreviousPage
                }
            });
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};
