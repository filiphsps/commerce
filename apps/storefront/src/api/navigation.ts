import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { unstable_cache } from 'next/cache';

import type { HeaderDocument, HeaderDocumentData, MenuDocument, MenuDocumentData } from '@/prismic/types';

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
                    if (!Locale.isDefault(_locale)) {
                        return await MenuApi({ shop, locale: Locale.default }); // Try again with default locale.
                    }

                    throw new NotFoundError(`"Menu" with the locale "${locale.code}"`);
                }

                // TODO: Deal with errors properly.
                console.error(error);
                throw error;
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
                    if (!Locale.isDefault(_locale)) {
                        return await HeaderApi({ shop, locale: Locale.default }); // Try again with default locale.
                    }

                    throw new NotFoundError(`"Header" with the locale "${locale.code}"`);
                }

                // TODO: Deal with errors properly.
                console.error(error);
                throw error;
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
}
