import { unstable_cache as cache } from 'next/cache';

import type { Shop } from '@nordcom/commerce-database';
import { Error, NotFoundError, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { buildCacheTagArray } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type { CollectionPageDocument, CustomPageDocument, ProductPageDocument } from '@/prismic/types';
import type { PrismicDocument } from '@prismicio/client';

export const PagesApi = async ({
    shop,
    locale,
    exclude = ['shop', 'countries', 'search', 'cart']
}: {
    shop: Shop;
    locale: Locale;
    exclude?: string[];
}): Promise<PrismicDocument[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const client = createClient({ shop, locale });
            const pages = await client.getAllByType('custom_page', {
                limit: 50,
                lang: locale.code
            });

            // TODO: Remove filter once we've migrated away from "special" pages
            const filtered = pages.filter(({ uid }) => !exclude.includes(uid!));
            return resolve(filtered);
        } catch (error: unknown) {
            if (Error.isNotFound(error)) {
                if (!Locale.isDefault(locale)) {
                    return resolve(await PagesApi({ shop, locale: Locale.default, exclude })); // Try again with default locale.
                }

                return reject(new NotFoundError(`"Pages" for the locale "${locale.code}"`));
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

type PageTypeMapping = {
    collection_page: CollectionPageDocument;
    product_page: ProductPageDocument;
    custom_page: CustomPageDocument;
};
type NarrowedPageType<T> = T extends keyof PageTypeMapping ? PageTypeMapping[T] : never;

export type PageApiProps = {
    shop: Shop;
    locale: Locale;
    handle: string;
};

/**
 * @todo Generalize api helpers.
 */
export const PageApi = async <T extends keyof PageTypeMapping | 'custom_page' = 'custom_page'>({
    shop,
    locale,
    type = 'custom_page',
    handle
}: PageApiProps & { type?: T | 'custom_page' }): Promise<NarrowedPageType<T>['data'] | null> => {
    if (!(shop as any)) throw new UnknownShopDomainError();

    const callback = async ({
        shop,
        type,
        locale = Locale.default,
        handle
    }: PageApiProps & { type: T | 'custom_page' }) => {
        try {
            const client = createClient({ shop, locale });

            const { data: page } = await client.getByUID<NarrowedPageType<T>>(type, handle, {
                lang: locale.code
            });

            if (!page) {
                throw new NotFoundError(`"Page" with the handle "${handle}"`);
            }

            return page;
        } catch (error) {
            if (Error.isNotFound(error)) {
                if (!Locale.isDefault(locale)) {
                    return await PageApi({ shop, locale: Locale.default, type, handle }); // Try again with default locale.
                }

                return null;
            }

            // TODO: Deal with errors properly.
            // console.error(error);
            return null;
        }
    };

    // Fast-path for no cache.
    if (!cache || typeof cache !== 'function') return callback({ shop, locale, type, handle });

    return cache(callback, [shop.domain, shop.id], {
        tags: buildCacheTagArray(shop, locale, [handle, 'prismic', 'page']),
        revalidate: 60 * 60 * 8 // 8 hours.
    })({ shop, locale, type, handle });
};
