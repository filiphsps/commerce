import type { Shop } from '@/api/shop';
import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';
import { DefaultLocale, isDefaultLocale, type Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import type { Client as PrismicClient, PrismicDocument } from '@prismicio/client';

export const PagesApi = async ({
    shop,
    locale,
    client: _client,
    exclude = ['shop', 'countries', 'search', 'cart']
}: {
    shop: Shop;
    locale: Locale;
    client?: PrismicClient;
    exclude?: string[];
}): Promise<PrismicDocument[]> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ shop, locale });

        try {
            const pages = await client.getAllByType('custom_page', {
                lang: locale.locale
            });

            if (!pages) return reject(new Error('404: No pages found'));

            // TODO: Remove filter once we've migrated away from "special" pages
            const filtered = pages.filter(({ uid }) => !exclude.includes(uid!));
            return resolve(filtered);
        } catch (error: any) {
            if (error.message.includes('No documents')) {
                if (!isDefaultLocale(locale)) {
                    return resolve(await PagesApi({ shop, locale: DefaultLocale(), client, exclude })); // Try again with default locale.
                }

                return reject(new Error(`404: "Pages" for the locale "${locale.locale}" cannot be found`));
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
    shop,
    locale,
    type,
    client: _client,
    handle
}: {
    shop: Shop;
    locale: Locale;
    handle: string;
    client?: PrismicClient;
    type: T;
}): Promise<{
    page: PageType<T> | null;
}> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ shop, locale });

        try {
            const { data: page } = await client.getByUID(type, handle, {
                lang: locale.locale
            });

            if (!page) return resolve({ page: null });

            return resolve({
                page: page as any
            });
        } catch (error: any) {
            if (error.message.includes('No documents')) {
                if (!isDefaultLocale(locale)) {
                    return resolve(await PageApi({ shop, locale: DefaultLocale(), handle, type, client })); // Try again with default locale.
                }

                // Don't throw on 404.
                return resolve({ page: null });
            }

            return reject(error);
        }
    });
};
