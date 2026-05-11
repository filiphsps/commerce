import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';
import { unstable_cache } from 'next/cache';
import type { HeaderDocument, HeaderDocumentData, MenuDocument, MenuDocumentData } from '@/prismic/types';
import { Locale } from '@/utils/locale';
import { buildPrismicCacheTags, createClient } from '@/utils/prismic';

export type NavigationItem = {
    title: string;
    handle?: string;
    children: Array<{
        title: string;
        handle: string;
        description?: string;
    }>;
};

export const MenuApi = async ({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<MenuDocumentData> => {
    const client = createClient({ shop, locale });

    return unstable_cache(
        async () => {
            try {
                const menu = await client.getSingle<MenuDocument>('menu');

                return menu.data;
            } catch (error: unknown) {
                const _locale = client.defaultParams?.lang ? Locale.from(client.defaultParams.lang) : locale;

                if (Error.isNotFound(error)) {
                    const fallback = Locale.fallbackForShop(shop);
                    if (fallback.code !== _locale.code) {
                        return await MenuApi({ shop, locale: fallback }); // Try again with fallback locale.
                    }

                    throw new NotFoundError(`"Menu" with the locale "${locale.code}"`);
                }

                // TODO: Deal with errors properly.
                console.error(error);
                throw error;
            }
        },
        [shop.domain, locale.code, 'menu'],
        {
            revalidate: 86_400, // 24hrs.
            tags: buildPrismicCacheTags({ shop, locale, doc: { type: 'menu', uid: 'menu' } }),
        },
    )();
};

export async function HeaderApi({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<HeaderDocumentData> {
    const client = createClient({ shop, locale });

    return unstable_cache(
        async () => {
            try {
                const header = await client.getSingle<HeaderDocument>('header');

                return header.data;
            } catch (error: unknown) {
                const _locale = client.defaultParams?.lang ? Locale.from(client.defaultParams.lang) : locale;

                if (Error.isNotFound(error)) {
                    const fallback = Locale.fallbackForShop(shop);
                    if (fallback.code !== _locale.code) {
                        return await HeaderApi({ shop, locale: fallback }); // Try again with fallback locale.
                    }

                    throw new NotFoundError(`"Header" with the locale "${locale.code}"`);
                }

                // TODO: Deal with errors properly.
                console.error(error);
                throw error;
            }
        },
        [shop.domain, locale.code, 'header'],
        {
            revalidate: 86_400, // 24hrs.
            tags: buildPrismicCacheTags({ shop, locale, doc: { type: 'header', uid: 'header' } }),
        },
    )();
}
