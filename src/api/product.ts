import * as Sentry from '@sentry/nextjs';

import type {
    CountryCode,
    LanguageCode,
    Product,
    ProductEdge,
    WeightUnit
} from '@shopify/hydrogen-react/storefront-api-types';

import ConvertUnits from 'convert-units';
import { NextLocaleToCountry } from '../util/Locale';
import { gql } from '@apollo/client';
import { i18n } from '../../next-i18next.config.cjs';
import { storefrontClient } from './shopify';

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
    options(first: 5) {
        id
        name
        values
    }
    sellingPlanGroups(first: 5) {
        edges {
            node {
                name
            }
        }
    }
    variants(first: 5) {
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
    locale?: string;
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

            // TODO: Handle this; which should never be possible tbh
            default:
                return 'g';
        }
    };

    const country = NextLocaleToCountry(locale);
    // FIXME: Support more than just US here, because apparently there's
    //        more countries out there using imperial..
    const metric = country !== 'US';
    const unit = weightUnitToConvertUnits(weightUnit);
    // TODO: Do this properly.
    const targetUnit = (metric && 'g') || 'oz';

    const res = ConvertUnits(weight).from(unit).to(targetUnit);
    // TODO: Precision should be depending on unit.
    return `${Math.ceil(res)}${targetUnit}`;
};

export const ProductApi = async ({
    handle,
    locale
}: {
    handle: string;
    locale?: string;
}): Promise<Product> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('400: Invalid handle'));

        if (!locale || locale === 'x-default') locale = i18n.locales[1];

        const country = (
            locale?.split('-')[1] || i18n.locales[1].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || i18n.locales[1].split('-')[0]
        ).toUpperCase() as LanguageCode;

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query product($handle: String!) @inContext(language: ${language}, country: ${country}) {
                        productByHandle(handle: $handle) {
                            ${PRODUCT_FRAGMENT}
                        }
                    }
                `,
                variables: {
                    handle
                }
            });

            if (errors) return reject(new Error(errors.join('\n')));
            if (!data?.productByHandle)
                return reject(new Error('404: The requested document cannot be found'));

            try {
                data.productByHandle.descriptionHtml = data.productByHandle.descriptionHtml
                    .replaceAll(/ /g, ' ')
                    .replaceAll('\u00A0', ' ');
            } catch {}

            return resolve(data.productByHandle);
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

export const ProductsCountApi = async (): Promise<number> => {
    const count_products = async (count: number = 0, cursor?: string) => {
        const { data } = await storefrontClient.query({
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
            count += await count_products(count, data.products.edges.at(-1).cursor);

        return count + data.products.edges.length;
    };

    const count = await count_products();
    return count;
};

export const ProductsApi = async (
    limit: number = 250,
    cursor?: string
): Promise<{
    products: ProductEdge[];
    cursor?: string;
    pagination: {
        next: boolean;
        previous: boolean;
    };
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await storefrontClient.query({
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

            if (errors) return reject(new Error(`500: Something wen't wrong on our end`));
            if (!data.products)
                return reject(new Error('404: The requested document cannot be found'));

            return resolve({
                products: data.products.edges,
                cursor: data.products.edges.at(-1).cursor,
                pagination: {
                    next: data.products.pageInfo.hasNextPage,
                    previous: data.products.pageInfo.hasPreviousPage
                }
            });
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
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
            const { data } = await storefrontClient.query({
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
            resolve({
                page_info: {
                    start_cursor: page_info.startCursor,
                    end_cursor: page_info.endCursor,
                    has_next_page: page_info.hasNextPage,
                    has_prev_page: page_info.hasPreviousPage
                },
                products: data.products?.edges || []
            });
        } catch (error) {
            console.error(error);
            reject(error);
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
    id,
    locale
}: {
    id: string;
    locale?: string;
}): Promise<ProductVisuals> => {
    return new Promise(async (resolve, reject) => {
        if (!id) return reject(new Error('400: Invalid id'));

        if (!locale || locale === 'x-default') locale = i18n.locales[1];

        const country = (
            locale?.split('-')[1] || i18n.locales[1].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || i18n.locales[1].split('-')[0]
        ).toUpperCase() as LanguageCode;

        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query metaobject($id: ID!) @inContext(language: ${language}, country: ${country}) {
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
                variables: {
                    id
                }
            });

            if (errors) return reject(new Error(`500: Something wen't wrong on our end`));
            try {
                return resolve({
                    primaryAccent: data.metaobject.primaryAccent.value,
                    primaryAccentDark: data.metaobject.primaryAccentDark?.value === 'true',
                    secondaryAccent: data.metaobject.secondaryAccent.value,
                    secondaryAccentDark: data.metaobject.secondaryAccentDark?.value === 'true',
                    transparentBackgrounds: data.metaobject.transparentBackgrounds.value === 'true'
                });
            } catch (error) {
                return reject(new Error(`404: The requested document cannot be found`));
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
