import type { Shop } from '@/api/shop';
import type { CollectionPageDocument, CustomPageDocument, ProductPageDocument } from '@/prismic/types';
import { isNotFoundError } from '@/utils/errors';
import { DefaultLocale, isDefaultLocale, type Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import type { Client as PrismicClient, PrismicDocument } from '@prismicio/client';
import { cache } from 'react';

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
                lang: locale.code
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

                return reject(new Error(`404: "Pages" for the locale "${locale.code}" cannot be found`));
            }

            console.error(error);
            return reject(error);
        }
    });
};

export type PageType = 'collection_page' | 'product_page' | 'custom_page';
export type PageDocument<T> = T extends 'collection_page'
    ? CollectionPageDocument
    : T extends 'product_page'
    ? ProductPageDocument
    : CustomPageDocument;
export type PageData<T> = PageDocument<T>['data'];

export type Preloadable<T = unknown> = T & {
    preload: T extends (...args: infer A) => any ? (...args: A) => void : never;
};

/**
 * @todo Generalize api helpers.
 */
const cachablePageApi = cache(
    async <T extends PageType = 'custom_page'>({
        shop,
        locale,
        client: _client,
        handle,
        type = 'custom_page' as T
    }: {
        shop: Shop;
        locale: Locale;
        handle: string;
        client?: PrismicClient;
        type?: T;
    }): Promise<{
        page: PageData<T> | null;
    }> => {
        return new Promise(async (resolve, reject) => {
            const client = _client || createClient({ shop, locale });

            try {
                const { data: page } = await client.getByUID<PageDocument<T>>(type, handle, {
                    lang: locale.code
                });

                if (!page) return resolve({ page: null });

                return resolve({ page });
            } catch (error) {
                if (isNotFoundError(error)) {
                    if (!isDefaultLocale(locale)) {
                        return resolve(await PageApi({ shop, locale: DefaultLocale(), handle, type, client })); // Try again with default locale.
                    }

                    // Don't throw on 404.
                    // TODO: In the future we absolutely should.
                    return resolve({ page: null });
                }

                return reject(error);
            }
        });
    }
);
export const PageApi = cachablePageApi as Preloadable<typeof cachablePageApi>;

/**
 * Preload a page to speed up api calls.
 *
 * @see {@link https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#preloading-data}
 * @todo Generalize this for all API helpers.
 */
PageApi.preload = (data) => {
    void PageApi(data);
};
