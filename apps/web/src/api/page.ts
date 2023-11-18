import type { Client as PrismicClient } from '@prismicio/client';
import { asLink } from '@prismicio/client';

import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { createClient } from '@/prismic';
import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale, type Locale } from '@/utils/locale';

export const PagesApi = async ({
    domain,
    locale,
    client: _client
}: {
    domain?: string;
    locale: Locale;
    client?: PrismicClient;
}): Promise<{
    paths: string[];
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const client = _client || createClient({ domain, locale });
            const pages = await client.getAllByType('custom_page', {
                lang: locale.locale,
                fetchOptions: {
                    cache: undefined,
                    next: {
                        revalidate: 28_800, // 8hrs.
                        tags: ['prismic']
                    }
                }
            });

            if (!pages) return reject(new Error('404: No pages found'));

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
            if (error.message.includes('No documents')) {
                if (locale.locale !== BuildConfig.i18n.default) {
                    return resolve(await PagesApi({ locale: DefaultLocale(), client })); // Try again with default locale.
                }

                return reject('404: "Page" with handle "${handle}" cannot be found');
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
    domain,
    locale,
    type,
    client: _client,
    handle
}: {
    domain?: string;
    locale: Locale;
    handle: string;
    client?: PrismicClient;
    type: T;
}): Promise<{
    page: PageType<T> | null;
}> => {
    return new Promise(async (resolve, reject) => {
        try {
            const client = _client || createClient({ domain, locale });
            const { data: page } = await client.getByUID(type, handle, {
                lang: locale.locale,
                fetchOptions: {
                    cache: undefined,
                    next: {
                        revalidate: 28_800, // 8hrs.
                        tags: ['prismic']
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
            if (error.message.includes('No documents')) {
                if (locale.locale !== BuildConfig.i18n.default) {
                    return resolve(await PageApi({ locale: DefaultLocale(), handle, type, client })); // Try again with default locale.
                }

                return resolve({ page: null });
            }

            return reject(error);
        }
    });
};
