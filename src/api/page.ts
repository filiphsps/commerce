import * as prismic from '@prismicio/client';

import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';

import { createClient } from '@/prismic';
import { Config } from '@/utils/Config';
import { NextLocaleToLocale, type Locale } from '@/utils/Locale';

// TODO: Migrate to `Locale` type.
export const PagesApi = async ({
    locale
}: {
    locale?: string;
}): Promise<{
    paths: string[];
}> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        try {
            const client = createClient({});
            const pages = await client.getAllByType('custom_page', {
                lang: locale
            });

            if (!pages) return reject();

            // TODO: remove filter when we have migrated the shop page
            const paths = pages
                .map((page) => prismic.asLink(page))
                .filter((i) => i && !['/shop', '/countries', '/search', '/cart'].includes(i));
            return resolve({
                paths: paths as any
            });
        } catch (error: any) {
            if (error.message.includes('No documents') && locale !== Config.i18n.default) {
                return resolve(await PagesApi({})); // Try again with default locale
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
    handle
}: {
    locale?: Locale;
    handle: string;
    type: T;
}): Promise<{
    page: PageType<T> | null;
}> => {
    return new Promise(async (resolve, reject) => {
        if (!locale) locale = NextLocaleToLocale();

        try {
            const client = createClient({});
            const { data: page } = await client.getByUID(type, handle, {
                lang: locale.locale,
                fetchLinks: ['slices']
            });

            if (!page) return reject();

            return resolve({
                page: page as any
            });
        } catch (error: any) {
            if (error.message.includes('No documents') && locale.locale !== Config.i18n.default) {
                return resolve(await PageApi({ handle, type })); // Try again with default locale
            }

            return resolve({ page: null });
        }
    });
};
