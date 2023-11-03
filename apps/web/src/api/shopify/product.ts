import type { Product, ProductConnection, ProductEdge, WeightUnit } from '@shopify/hydrogen-react/storefront-api-types';

import type { AbstractApi } from '@/utils/abstract-api';
import ConvertUnits from 'convert-units';
import type { Locale } from '@/utils/locale';
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
    visuals: metafield(namespace: "store", key: "visuals") {
        value
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
    visuals: metafield(namespace: "store", key: "visuals") {
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
    const metric = locale.country !== 'US';
    const unit = weightUnitToConvertUnits(weightUnit);
    // TODO: Do this properly.
    const targetUnit = (metric && 'g') || 'oz';

    const res = ConvertUnits(weight).from(unit).to(targetUnit);
    // TODO: Precision should be depending on unit.
    return `${Math.ceil(res)}${targetUnit}`;
};

export const ProductApi = async ({ client, handle }: { client: AbstractApi; handle: string }): Promise<Product> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('400: Invalid handle'));

        try {
            const { data, errors } = await client.query<{ productByHandle: Product }>(
                gql`
                    fragment product on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query product($handle: String!, $language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
                        productByHandle(handle: $handle) {
                            ...product
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
    cursor
}: {
    client: AbstractApi;
    limit?: number;
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
                    fragment product on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query products($limit: Int!, $language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
                        products(
                            first: $limit,
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
                `,
                {
                    limit
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

export const ProductsPaginationApi = async ({
    client,
    limit,
    vendor,
    sorting,
    before,
    after
}: {
    client: AbstractApi;
    limit?: number;
    vendor?: string;
    sorting?: 'BEST_SELLING' | 'CREATED_AT' | 'PRICE' | 'RELEVANCE' | 'TITLE' | 'VENDOR';
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
    const limit_n = limit || 35;
    const sort_key = sorting || 'BEST_SELLING';

    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await client.query<{ products: ProductConnection }>(
                gql`
                    fragment product on Product {
                        ${PRODUCT_FRAGMENT}
                    }

                    query products($language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
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

export type ProductVisuals = {
    primaryAccent: string;
    primaryAccentDark: boolean;
    secondaryAccent: string;
    secondaryAccentDark: boolean;
    transparentBackgrounds: boolean;
};
export const ProductVisualsApi = async ({
    client,
    id
}: {
    client: AbstractApi;
    id: string;
}): Promise<ProductVisuals> => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject(new Error('400: Invalid id'));

        try {
            const { data, errors } = await client.query<{ metaobject: any }>(
                gql`
                    query metaobject($id: ID!, $language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
                        metaobject(id: $id) {
                            primaryAccent: field(key: "primary_accent") {
                                value
                            }
                            primaryAccentDark: field(key: "primary_accent_dark") {
                                value
                            }
                            secondaryAccent: field(key: "secondary_accent") {
                                value
                            }
                            secondaryAccentDark: field(key: "secondary_accent_dark") {
                                value
                            }
                            transparentBackgrounds: field(key: "transparent_backgrounds") {
                                value
                            }
                        }
                    }
                `,
                {
                    id
                }
            );

            if (errors) return reject(new Error(`500: Something went wrong on our end`));
            else if (!data?.metaobject) return reject(new Error(`404: "Product" with id "${id}" cannot be found`));

            try {
                return resolve({
                    primaryAccent: data.metaobject.primaryAccent.value,
                    primaryAccentDark: data.metaobject.primaryAccentDark?.value === 'true',
                    secondaryAccent: data.metaobject.secondaryAccent.value,
                    secondaryAccentDark: data.metaobject.secondaryAccentDark?.value === 'true',
                    transparentBackgrounds: data.metaobject.transparentBackgrounds.value === 'true'
                });
            } catch (error: any) {
                return reject(new Error(`500: Something went wrong on our end`));
            }
        } catch (error: any) {
            console.error(error);
            return reject(error);
        }
    });
};
