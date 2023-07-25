import { captureException } from '@sentry/nextjs';

import type { CountryCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

import { gql } from '@apollo/client';
import { i18n } from 'next-i18next.config.cjs';
import type { RedirectModel } from '../models/RedirectModel';
import { storefrontClient } from './shopify';

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

export const RedirectsApi = async ({
    locale
}: {
    locale?: string;
}): Promise<Array<RedirectModel>> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = i18n.locales[1];

        const country = (
            locale?.split('-')[1] || i18n.locales[1].split('-')[1]
        ).toUpperCase() as CountryCode;
        const language = (
            locale?.split('-')[0] || i18n.locales[1].split('-')[0]
        ).toUpperCase() as LanguageCode;

        try {
            // FIXME: Handle more than 250 redirects
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query urlRedirects($limit: Int!) @inContext(language: ${language}, country: ${country}) {
                        urlRedirects(first: $limit) {
                            edges {
                                node {
                                    path
                                    target
                                }
                            }
                        }
                    }
                `,
                variables: {
                    limit: 250
                }
            });

            if (errors) return reject(new Error(errors.join('\n')));
            if (!data?.urlRedirects)
                return reject(new Error('404: The requested document cannot be found'));

            return resolve(Convertor(data?.urlRedirects?.edges));
        } catch (error) {
            captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};

export const RedirectApi = async ({
    path,
    locale
}: {
    path: string;
    locale?: string;
}): Promise<string | null> => {
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
export const RedirectCollectionApi = async ({
    handle,
    locale
}: {
    handle: string;
    locale?: string;
}) => RedirectApi({ path: `/collections/${handle}`, locale });
