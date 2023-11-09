import type { Client as PrismicClient } from '@prismicio/client';
import { asLink } from '@prismicio/client';

import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { createClient } from '@/prismic';
import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale, type Locale } from '@/utils/locale';

export const PagesApi = async ({
    locale,
    client: _client
}: {
    locale: Locale;
    client?: PrismicClient;
}): Promise<{
    paths: string[];
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const client = _client || createClient({ locale });
            const pages = await client.getAllByType('custom_page', {
                lang: locale.locale,
                fetchOptions: {
                    cache: undefined,
                    next: {
                        revalidate: 120
                    }
                }
            });

            if (!pages) return reject();

            // TODO: Remove filter once we have migrated the shop page.
            const paths = pages
                .map((page) => asLink(page))
                .filter((i) => i && !['/shop', '/countries', '/search', '/cart'].includes(i));
            return resolve({
                paths: paths as any
            });
            // TODO: Error type.
        } catch (error: any) {
            // TODO: `isDefaultLocale` utility function.
            if (error.message.includes('No documents') && locale.locale !== BuildConfig.i18n.default) {
                return resolve(await PagesApi({ locale: DefaultLocale(), client: _client })); // Try again with default locale.
            }

            console.error(error);
            return reject(error);
        }
    });
};

type PageType<T> = T extends 'collection_page'
    ? CollectionPageDocumentData
    : T extends 'product_page'
    ? ProductPageDocumentData
    : CustomPageDocumentData;

export const PageApi = async <T extends 'collection_page' | 'product_page' | 'custom_page'>({
    locale,
    type,
    client: _client,
    handle
}: {
    locale: Locale;
    handle: string;
    client?: PrismicClient;
    type: T;
}): Promise<{
    page: PageType<T> | null;
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const client = _client || createClient({ locale });
            const { data: page } = await client.getByUID(type, handle, {
                lang: locale.locale,
                fetchOptions: {
                    cache: undefined,
                    next: {
                        revalidate: 120
                    }
                },
                fetchLinks: ['slices']
            });

            if (!page) return reject();

            return resolve({
                page: page as any
            });
        } catch (error: any) {
            // TODO: `isDefaultLocale` utility function.
            if (error.message.includes('No documents') && locale.locale !== BuildConfig.i18n.default) {
                return resolve(await PageApi({ locale: DefaultLocale(), handle, type, client: _client })); // Try again with default locale
            }

            return resolve({ page: null });
        }
    });
};
