import { newShopify, shopify } from './shopify';

import { ProductModel } from '../models/ProductModel';
import { ProductVariantModel } from '../models/ProductVariantModel';
import { ShopifyWeightUnit } from '../models/WeightModel';
import TitleToHandle from '../util/TitleToHandle';
import { gql } from '@apollo/client';

export const PRODUCT_FRAGMENT = `
    id
    handle
    createdAt
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
                sku
                title
                barcode
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
    ingredients: metafield(namespace: "store", key: "ingredients") {
        value
    }
    keywords: metafield(namespace: "store", key: "keywords") {
        value
    }
`;

export const Convertor = (product: any): ProductModel => {
    if (!product) return null;

    let metafields = {
        ingredients: product.ingredients?.value ?? null
    };

    const images = product?.images.edges.map(({ node }) => ({
        id: node.id?.includes('=') ? atob(node?.id) : node?.id,
        alt: node.altText ?? null,
        src: node.originalSrc,
        height: node.height,
        width: node.width
    }));

    return {
        id: (product?.id?.includes('=') ? atob(product.id) : product.id)
            .split('/')
            .at(-1),
        handle: product?.handle,
        created_at: product.createdAt,

        title: product?.title,
        description: product?.description,
        body: product?.descriptionHtml,
        type: product?.productType,
        tags: product?.tags,
        seo: {
            title: product?.seo?.title,
            description: product?.seo?.description,
            keywords: product?.keywords?.value || ''
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
                const imageId = variant.image?.id?.includes('=')
                    ? atob(variant.image?.id)
                    : variant.image?.id;
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
                    id: (variant?.id?.includes('=')
                        ? atob(variant.id)
                        : variant.id
                    )
                        .split('/')
                        .at(-1),
                    title: variant.title,
                    default_image: defaultImage ?? 0,
                    sku: variant.sku,
                    barcode: variant.barcode,
                    pricing: {
                        currency: variant.priceV2.currencyCode,
                        range: Number.parseFloat(variant.priceV2.amount),
                        compare_at_range:
                            Number.parseFloat(
                                variant.compareAtPriceV2?.amount
                            ) || null
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

export const ProductApi = async ({
    handle,
    locale
}: {
    handle: string;
    locale?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject();

        const language = locale ? locale.split('-')[0].toUpperCase() : 'EN';
        const country = locale ? locale.split('-').at(-1).toUpperCase() : 'US';

        try {
            const { data, errors } = await newShopify.query({
                query: gql`
                fragment product on Product {
                    ${PRODUCT_FRAGMENT}
                }
                query product($handle: String!) @inContext(language: ${language}, country: ${country}) {
                    productByHandle(handle: $handle) {
                        ...product
                    }
                }
                `,
                variables: {
                    handle
                }
            });

            if (errors) {
                console.error(errors);
                reject(errors);
            }

            const result = Convertor(data?.productByHandle);
            if (!result) return reject();

            return resolve(result);
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

export const ProductIdApi = async ({
    id,
    locale
}: {
    id: string;
    locale?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject();

        const language = locale ? locale.split('-')[0].toUpperCase() : 'EN';
        const country = locale ? locale.split('-').at(-1).toUpperCase() : 'US';

        let formatted_id = id;
        if (!id.includes('/')) formatted_id = `gid://shopify/Product/${id}`;

        try {
            const { data, errors } = await newShopify.query({
                query: gql`
                query getProduct($id: ID!) @inContext(language: ${language}, country: ${country}) {
                    node(id: $id) {
                        ...on Product {
                            ${PRODUCT_FRAGMENT}
                        }
                    }
                }
                `,
                variables: {
                    id: btoa(formatted_id)
                }
            });

            if (errors && errors.length > 0) return reject(errors);

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
            const { data } = await newShopify.query({
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

export const ProductsPaginationApi = async ({
    limit,
    vendor,
    sorting,
    before,
    after
}: {
    limit?: number;
    vendor?: string;
    sorting?:
        | 'BEST_SELLING'
        | 'CREATED_AT'
        | 'PRICE'
        | 'RELEVANCE'
        | 'TITLE'
        | 'VENDOR';
    before?: string;
    after?: string;
}): Promise<{
    page_info: {
        start_cursor: string;
        end_cursor: string;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    products: ProductModel[];
}> => {
    const limit_n = limit || 35;
    const sort_key = sorting || 'BEST_SELLING';

    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await newShopify.query({
                query: gql`
            fragment product on Product {
                ${PRODUCT_FRAGMENT}
            }
            query products {
                products(
                    first: ${limit_n},
                    sortKey: ${sort_key}
                    ${vendor ? `,query:"vendor:${vendor}"` : ''}
                    ${before ? `,before:"${before}"` : ''}
                    ${after ? `,after:"${after}"` : ''}
                )
                {
                    edges {
                        cursor
                        node {
                            ...product
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
            `
            });

            const page_info = data.products.pageInfo;
            const products = data.products.edges.map((product) =>
                Convertor(product.node)
            );

            resolve({
                page_info: {
                    start_cursor: page_info.startCursor,
                    end_cursor: page_info.endCursor,
                    has_next_page: page_info.hasNextPage,
                    has_prev_page: page_info.hasPreviousPage
                },
                products
            });
        } catch (error) {
            console.error(error);
            reject(error);
        }
    });
};
