import { NextLocaleToCountry, NextLocaleToLanguage } from '@/utils/locale';

import { storefrontClient } from '@/api/shopify';
import type { RedirectModel } from '@/models/RedirectModel';
import { BuildConfig } from '@/utils/build-config';
import { gql } from 'graphql-tag';

export const Convertor = (
    redirects: Array<{
        node: any;
    }>
): Array<RedirectModel> => {
    let entries: any[] = [];
    redirects.forEach((redirect) => {
        entries.push(redirect?.node);
    });

    // Remove duplicates and create a proper object
    return Array.from(new Set(entries)).map((redirect) => ({
        path: redirect.path,
        target: redirect.target
    }));
};

// TODO: Migrate to `Locale` type.
export const RedirectsApi = async ({ locale }: { locale?: string }): Promise<Array<RedirectModel>> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = BuildConfig.i18n.default;

        const country = NextLocaleToCountry(locale);
        const language = NextLocaleToLanguage(locale);

        try {
            const redirects: any[] = [];

            let cursor = null;
            while (true) {
                const { data, errors }: any = await storefrontClient.query({
                    query: gql`
                        query urlRedirects($limit: Int!) @inContext(language: ${language}, country: ${country}) {
                            urlRedirects(first: $limit ${(cursor && `, after: "${cursor}"`) || ''}) {
                                edges {
                                    cursor
                                    node {
                                        path
                                        target
                                    }
                                }
                                pageInfo {
                                    hasNextPage
                                }
                            }
                        }
                    `,
                    variables: {
                        limit: 250
                    }
                });

                if (errors) return reject(new Error(`500: ${new Error(errors.map((e: any) => e.message).join('\n'))}`));

                cursor = data.urlRedirects.edges.at(-1).cursor;
                redirects.push(...data.urlRedirects.edges);
                if (!data.urlRedirects.pageInfo.hasNextPage) break;
            }

            if (!redirects.length) return reject(new Error('404: The requested document cannot be found'));

            return resolve(Convertor(redirects));
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const RedirectApi = async ({ path, locale }: { path: string; locale?: string }): Promise<string | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            const redirects = await RedirectsApi({ locale });
            for (let i = 0; i < redirects.length; i++) {
                const redirect = redirects[i];

                if (redirect.path !== path) continue;

                return resolve(redirect.target);
            }
            return resolve(null);
        } catch (error) {
            return reject(error);
        }
    });
};

export const RedirectProductApi = async ({ handle, locale }: { handle: string; locale?: string }) =>
    RedirectApi({ path: `/products/${handle}`, locale });
export const RedirectCollectionApi = async ({ handle, locale }: { handle: string; locale?: string }) =>
    RedirectApi({ path: `/collections/${handle}`, locale });
