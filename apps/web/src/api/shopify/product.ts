import type {
    Product,
    ProductConnection,
    ProductEdge,
    ProductSortKeys,
    ProductVariant,
    WeightUnit
} from '@shopify/hydrogen-react/storefront-api-types';

import type { AbstractApi } from '@/utils/abstract-api';
import type { Locale } from '@/utils/locale';
import ConvertUnits from 'convert-units';
import { gql } from 'graphql-tag';

export const PRODUCT_FRAGMENT_MINIMAL = `
    id
    handle
    availableForSale
    createdAt
    title
    description
    vendor
    tags
    seo {
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
    options(first: 3) {
        id
        name
        values
    }
    sellingPlanGroups(first: 3) {
        edges {
            node {
                name
            }
        }
    }
    variants(first: 3) {
        edges {
            node {
                id
                title
                price {
                    amount
                    currencyCode
                }
                compareAtPrice {
                    amount
                    currencyCode
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
    images(first: 5) {
        edges {
            node {
                id
                altText
                url
                height
                width
            }
        }
    }
`;

export const PRODUCT_FRAGMENT = `
    id
    handle
    availableForSale
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
    sellingPlanGroups(first: 250) {
        edges {
            node {
                appName
                name
                options {
                    name,
                    values
                }
            }
        }
    }
    variants(first: 250) {
        edges {
            node {
                id
                sku
                title
                barcode
                price {
                    amount
                    currencyCode
                }
                compareAtPrice {
                    amount
                    currencyCode
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
                url
                height
                width
            }
        }
    }
    originalName: metafield(namespace: "store", key: "original-name") {
        value
    }
    ingredients: metafield(namespace: "store", key: "ingredients") {
        value
    }
    keywords: metafield(namespace: "store", key: "keywords") {
        value
    }
`;

// Handle metric and imperial
export const ConvertToLocalMeasurementSystem = ({
    locale,
    weight,
    weightUnit
}: {
    locale: Locale;
    weight: number;
    weightUnit: WeightUnit;
}): string => {
    const weightUnitToConvertUnits = (unit: WeightUnit) => {
        switch (unit) {
            case 'GRAMS':
                return 'g';
            case 'KILOGRAMS':
                return 'kg';
            case 'OUNCES':
                return 'oz';
            case 'POUNDS':
                return 'lb';

            // TODO: Handle this; which should never possibly actually occur.
            default:
                return 'g';
        }
    };
    // FIXME: Support more than just US here, because apparently there's alot
    //        more countries out there using imperial.
    const metric = locale.country.toLowerCase() !== 'us';
    const unit = weightUnitToConvertUnits(weightUnit);
    // TODO: Do this properly.
    const targetUnit = (metric && 'g') || 'oz';

    const res = ConvertUnits(weight).from(unit).to(targetUnit);
    // TODO: Precision should be depending on unit.
    return `${Math.ceil(res)}${targetUnit}`;
};

const FixProduct = (product: Product): Product => {
    // Handle variants that should have their weight as their actual title
    // FIXME: Remove `Size` when we've migrated to using Weight.
    // FIXME: Remove incorrectly translated ones, eg  "Größe" & "Storlek".
    const variants = ((variants) =>
        variants && {
            ...product.variants,
            edges: product.variants.edges.map(({ node, cursor }) => ({
                cursor,
                node: {
                    ...(node as ProductVariant),
                    selectedOptions: node.selectedOptions.map((option) => {
                        if (['weight', 'größe', 'storlek'].includes(option.name)) {
                            return {
                                ...option,
                                name: 'Size',
                                value: option.value
                            };
                        }

                        return option;
                    })
                }
            }))
        })(product.variants);

    return {
        ...product,
        variants: variants
    };
};

export const ProductApi = async ({ client, handle }: { client: AbstractApi; handle: string }): Promise<Product> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('400: Invalid handle'));

        try {
            const { data, errors } = await client.query<{ productByHandle: Product }>(
                gql`
                    fragment ProductFragment on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query product($handle: String!) {
                        productByHandle(handle: $handle) {
                            ...ProductFragment
                        }
                    }
                `,
                {
                    handle
                }
            );

            if (errors) return reject(new Error(`500: ${new Error(errors.map((e: any) => e.message).join('\n'))}`));
            if (!data?.productByHandle)
                return reject(new Error(`404: "Product" with handle "${handle}" cannot be found`));

            try {
                data.productByHandle.descriptionHtml = data.productByHandle.descriptionHtml
                    .replaceAll(/ /g, ' ')
                    .replaceAll('\u00A0', ' ');
            } catch {}

            return resolve(data.productByHandle);
        } catch (error: any) {
            console.error(error);
            return reject(error);
        }
    });
};

export const ProductsCountApi = async ({ client }: { client: AbstractApi }): Promise<number> => {
    const count_products = async (count: number = 0, cursor?: string) => {
        const { data } = await client.query<{ products: ProductConnection }>(
            gql`
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
        );

        if (!data?.products?.edges) return count;

        if (data.products.pageInfo.hasNextPage)
            count += await count_products(count, data.products.edges.at(-1)!.cursor);

        return count + data.products.edges.length;
    };

    const count = await count_products();
    return count;
};

export const ProductsApi = async ({
    client,
    limit = 250,
    sorting = 'BEST_SELLING',
    cursor
}: {
    client: AbstractApi;
    limit?: number;
    sorting?: ProductSortKeys;
    cursor?: string;
}): Promise<{
    products: ProductEdge[];
    cursor?: string;
    pagination: {
        next: boolean;
        previous: boolean;
    };
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await client.query<{ products: ProductConnection }>(
                gql`
                    fragment ProductFragment on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query products($limit: Int!, $sorting: ProductSortKeys, $cursor: String) {
                        products(
                            first: $limit,
                            sortKey: $sorting,
                            after: $cursor
                        )
                        {
                            edges {
                                cursor
                                node {
                                    ...ProductFragment
                                }
                            }
                            pageInfo {
                                hasNextPage
                                hasPreviousPage
                            }
                        }
                    }
                `,
                {
                    limit,
                    sorting: sorting || null,
                    cursor: cursor || null
                }
            );

            if (errors)
                return reject(
                    new Error(`500: Something went wrong on our end (${errors.map((e) => e.message).join('\n')})`)
                );
            if (!data?.products?.edges) return reject(new Error(`404: No products could be found`));

            return resolve({
                products: data.products.edges,
                cursor: data.products.edges.at(-1)!.cursor,
                pagination: {
                    next: data.products.pageInfo.hasNextPage,
                    previous: data.products.pageInfo.hasPreviousPage
                }
            });
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

/***
 * Fetches products from the Shopify API.
 *
 * @param {Object} options - The options.
 * @param {AbstractApi} options.client - The AbstractApi to use.
 * @param {number} [options.limit=35] - The limit of products to fetch.
 * @param {ProductSortKeys} [options.sorting=BEST_SELLING] - The sorting to use.
 * @param {string} [options.vendor] - The vendor to use.
 * @param {string} [options.before] - The cursor to use for pagination.
 * @param {string} [options.after] - The cursor to use for pagination.
 * @returns {Promise<ProductEdge[]>} The products.
 */
export const ProductsPaginationApi = async ({
    client,
    limit = 35,
    sorting = 'BEST_SELLING',
    vendor,
    before,
    after
}: {
    client: AbstractApi;
    limit?: number;
    vendor?: string;
    sorting?: ProductSortKeys;
    before?: string;
    after?: string;
}): Promise<{
    page_info: {
        start_cursor: string;
        end_cursor: string;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
    products: ProductEdge[];
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await client.query<{ products: ProductConnection }>(
                gql`
                    fragment ProductFragment on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query products($limit: Int!, $sorting: ProductSortKeys, $query: String) {
                        products(
                            first: $limit,
                            sortKey: $sorting,
                            query: $query,
                            ${before ? `,before:"${before}"` : ''}
                            ${after ? `,after:"${after}"` : ''}
                        )
                        {
                            edges {
                                cursor
                                node {
                                    ...ProductFragment
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
                `,
                {
                    limit,
                    query: (vendor && `query:"vendor:${vendor}"`) || null,
                    sorting: sorting || null
                }
            );

            const page_info = data?.products.pageInfo;
            if (!page_info) return reject(new Error(`500: Something went wrong on our end`));

            return resolve({
                page_info: {
                    start_cursor: page_info.startCursor || '', // TODO: Handle this properly.
                    end_cursor: page_info.endCursor || '', // TODO: Handle this properly.
                    has_next_page: page_info.hasNextPage,
                    has_prev_page: page_info.hasPreviousPage
                },
                products: data.products?.edges || []
            });
        } catch (error: any) {
            console.error(error);
            return reject(error);
        }
    });
};
