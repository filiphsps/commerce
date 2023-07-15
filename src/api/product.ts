import * as Sentry from '@sentry/nextjs';

import {
    CountryCode,
    LanguageCode,
    Product,
    ProductEdge,
    WeightUnit
} from '@shopify/hydrogen-react/storefront-api-types';
import { FinalColor, extractColors } from 'extract-colors';

import Color from 'color';
import ConvertUnits from 'convert-units';
import { NextLocaleToCountry } from '../util/Locale';
import TinyCache from 'tinycache';
import getPixels from 'get-pixels';
import { gql } from '@apollo/client';
import { i18n } from '../../next-i18next.config.cjs';
import { storefrontClient } from './shopify';

export const PRODUCT_FRAGMENT_MINIMAL = `
    id
    handle
    createdAt
    title
    vendor
    tags
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
`;

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
    ingredients: metafield(namespace: "store", key: "ingredients") {
        value
    }
    keywords: metafield(namespace: "store", key: "keywords") {
        value
    }
    originalName: metafield(namespace: "store", key: "original-name") {
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
    return `${Math.round(res)}${targetUnit}`;
};

// TODO: Remove this when our shopify app handles it and sets it as metadata instead.
export interface ExtractAccentColorsFromImageRes {
    primary: string;
    primary_dark: string;
    primary_foreground: string;
    secondary: string;
    secondary_dark: string;
    secondary_foreground: string;
}
export const PRODUCT_ACCENT_CACHE_TIMEOUT = 6 * 60 * 60 * 1000; // Set 6 hour maximum timeout
export const ExtractAccentColorsFromImage = (
    url?: string
): Promise<ExtractAccentColorsFromImageRes> => {
    if (!globalThis.color_cache) {
        globalThis.color_cache = new TinyCache();
    }

    const setupColors = (colors: FinalColor[]): ExtractAccentColorsFromImageRes => {
        const sorted = colors.sort((a, b) => b.area - a.area);

        let primary = Color(sorted.at(0)!.hex).darken(0.25).desaturate(0.1);
        const secondary = Color(sorted.at(1)!.hex).darken(0.15).desaturate(0.15);
        if (primary.saturationl() < 10 && primary.saturationv() < 10) {
            return setupColors(sorted.slice(1));
        }

        let primaryForegroundColor =
            (primary.isDark() &&
                primary.desaturate(0.75).whiten(0.75).lighten(2.75).darken(0.05)) ||
            primary.lighten(0.5).desaturate(0.5).darken(1);
        let secondaryForegroundColor =
            (secondary.isDark() &&
                secondary.desaturate(0.75).whiten(0.75).lighten(2.75).darken(0.05)) ||
            secondary.lighten(0.5).desaturate(0.5).darken(1);

        // Increase brightness if it's too dark
        if (primary.isDark() && primaryForegroundColor.lightness() < 85)
            primaryForegroundColor = primaryForegroundColor.lighten(1);
        if (secondary.isDark() && secondaryForegroundColor.lightness() < 85)
            secondaryForegroundColor = secondaryForegroundColor.lighten(1);

        return {
            primary: primary.hex().toString(),
            primary_dark: primary.darken(0.15).hex().toString(),
            primary_foreground: primaryForegroundColor.hex().toString(),
            secondary: secondary.hex().toString(),
            secondary_dark: secondary.darken(0.15).hex().toString(),
            secondary_foreground: secondaryForegroundColor.hex().toString()
        };
    };

    return new Promise(async (resolve, reject) => {
        if (!url) return reject(new Error('No image url.'));

        if (globalThis.color_cache) {
            const res = globalThis.color_cache.get(url) as ExtractAccentColorsFromImageRes | null;
            if (res) return resolve(res);
        }

        try {
            if (typeof window === 'undefined') {
                return getPixels(url, async (error, pixels) => {
                    if (error) return reject(error);

                    const data = [...pixels.data];
                    const width = Math.round(Math.sqrt(data.length / 4));
                    const height = width;

                    const res = setupColors(await extractColors({ data, width, height }));

                    if (globalThis.color_cache) {
                        globalThis.color_cache.put(url, res, PRODUCT_ACCENT_CACHE_TIMEOUT);
                    }

                    return resolve(res);
                });
            } else {
                const res = setupColors(await extractColors(url, { crossOrigin: 'anonymous' }));

                if (globalThis.color_cache) {
                    globalThis.color_cache.put(url, res, PRODUCT_ACCENT_CACHE_TIMEOUT);
                }
                return resolve(res);
            }
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const ProductApi = async ({
    handle,
    locale
}: {
    handle: string;
    locale?: string;
}): Promise<Product> => {
    return new Promise(async (resolve, reject) => {
        if (!handle) return reject(new Error('Invalid handle'));

        if (locale === 'x-default') locale = i18n.locales[1];

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
                data.productByHandle.accent = await ExtractAccentColorsFromImage(
                    data.productByHandle.images?.edges?.at(0)?.node?.url
                );
            } catch {}

            try {
                data.productByHandle.descriptionHtml = data.productByHandle.descriptionHtml
                    .replaceAll(/ /g, ' ')
                    .replaceAll('\u00A0', ' ');
            } catch {}

            return resolve(/*flattenConnection(*/ data.productByHandle /*)*/);
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

            if (errors) return reject(new Error(errors.join('\n')));
            if (!data.products)
                return reject(new Error('404: The requested document cannot be found'));

            if (data.products?.edges)
                data.products.edges = await Promise.all(
                    data.products.edges.map(async (edge) => {
                        if (!edge.node?.images?.edges?.at(0)?.node?.url) return edge;

                        try {
                            edge.node.accent = await ExtractAccentColorsFromImage(
                                edge.node?.images?.edges?.at(0)?.node?.url
                            );
                            return edge;
                        } catch {
                            return edge;
                        }
                    })
                );

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

            if (data.products?.edges)
                data.products.edges = await Promise.all(
                    data.products.edges.map(async (edge) => {
                        if (!edge.node?.images?.edges?.at(0)?.node?.url) return edge;

                        try {
                            edge.node.accent = await ExtractAccentColorsFromImage(
                                edge.node?.images?.edges?.at(0)?.node?.url
                            );
                            return edge;
                        } catch {
                            return edge;
                        }
                    })
                );

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
