import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { unstable_cache } from 'next/cache';

import type {
    CartPageDocument,
    CollectionPageDocument,
    CustomPageDocument,
    ProductPageDocument,
    Simplify
} from '@/prismic/types';
import type { PrismicDocument } from '@prismicio/client';

export const PagesApi = async ({
    shop,
    locale,
    exclude = ['homepage', 'shop', 'countries', 'search', 'cart']
}: {
    shop: OnlineShop;
    locale: Locale;
    exclude?: string[];
}): Promise<PrismicDocument[] | null> => {
    const client = createClient({ shop, locale });

    return unstable_cache(
        async () => {
            try {
                const pages = await client.getAllByType('custom_page');

                return pages.filter(({ uid }) => !exclude.includes(uid!));
            } catch (error: unknown) {
                const _locale = client.defaultParams?.lang ? Locale.from(client.defaultParams.lang) : locale;

                if (Error.isNotFound(error)) {
                    if (!Locale.isDefault(_locale)) {
                        return await PagesApi({ shop, locale: Locale.default }); // Try again with default locale.
                    }

                    return null;
                }

                // TODO: Deal with errors properly.
                console.error(error);
                return null;
            }
        },
        [
            shop.domain,
            Locale.default.code // TODO: This should be the actual locale, but we're calling prismic.io's API way too much.
            /* locale.code */
        ],
        {
            revalidate: 86_400, // 24hrs.
            tags: ['prismic', shop.domain, locale.code]
        }
    )();
};

export type PageType = 'collection_page' | 'product_page' | 'cart_page' | 'custom_page';
export type PageDocument<T> = T extends 'collection_page'
    ? CollectionPageDocument
    : T extends 'product_page'
      ? ProductPageDocument
      : T extends 'cart_page'
        ? CartPageDocument
        : CustomPageDocument;
export type PageData<T> = PageDocument<T>['data'];

type PageTypeMapping = {
    collection_page: CollectionPageDocument;
    product_page: ProductPageDocument;
    custom_page: CustomPageDocument;
    cart_page: CartPageDocument;
};
type NarrowedPageType<T> = T extends keyof PageTypeMapping ? PageTypeMapping[T] : never;

export type PageApiProps = {
    shop: OnlineShop;
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
}: PageApiProps & { type?: T | 'custom_page' }): Promise<Simplify<NarrowedPageType<T>['data']> | null> => {
    const client = createClient({ shop, locale });

    return unstable_cache(
        async (handle: string, type: T) => {
            try {
                const { data: page } = await client.getByUID<NarrowedPageType<T>>(type, handle);
                if (!(page as any)) {
                    throw new NotFoundError(`"Page" with the handle "${handle}"`);
                }

                return page;
            } catch (error: unknown) {
                const _locale = client.defaultParams?.lang ? Locale.from(client.defaultParams.lang) : locale;

                if (Error.isNotFound(error)) {
                    if (!Locale.isDefault(_locale)) {
                        return await PageApi({ shop, locale: Locale.default, type, handle }); // Try again with default locale.
                    }

                    return null;
                }

                // TODO: Deal with errors properly.
                console.error(error);
                return null;
            }
        },
        [
            shop.domain,
            Locale.default.code // TODO: This should be the actual locale, but we're calling prismic.io's API way too much.
            /* locale.code */
        ],
        {
            revalidate: 86_400, // 24hrs.
            tags: ['prismic', shop.domain, locale.code, `page.${handle}`]
        }
    )(handle, type as T);
};
