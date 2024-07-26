import type { Shop } from '@nordcom/commerce-database';
import { Error, NotFoundError, UnknownShopDomainError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type {
    CartPageDocument,
    CollectionPageDocument,
    CustomPageDocument,
    ProductPageDocument
} from '@/prismic/types';
import type { PrismicDocument } from '@prismicio/client';

export const PagesApi = async ({
    shop,
    locale,
    exclude = ['homepage', 'shop', 'countries', 'search', 'cart']
}: {
    shop: Shop;
    locale: Locale;
    exclude?: string[];
}): Promise<PrismicDocument[] | null> => {
    try {
        const client = createClient({ shop, locale });

        const pages = await client.getAllByType('custom_page', {
            lang: locale.code
        });

        return pages.filter(({ uid }) => !exclude.includes(uid!));
    } catch (error) {
        if (Error.isNotFound(error)) {
            if (!Locale.isDefault(locale)) {
                return await PagesApi({ shop, locale: Locale.default }); // Try again with default locale.
            }

            return null;
        }

        // TODO: Deal with errors properly.
        // console.error(error);
        return null;
    }
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
