import type { OnlineShop } from '@nordcom/commerce-db';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type { MenuDocument, MenuDocumentData, NavigationDocument } from '@/prismic/types';

export type NavigationItem = {
    title: string;
    handle?: string;
    children: Array<{
        title: string;
        handle: string;
        description?: string;
    }>;
};

export const NavigationApi = async ({
    shop,
    locale
}: {
    shop: OnlineShop;
    locale: Locale;
}): Promise<NavigationItem[]> => {
    const client = createClient({ shop, locale });

    try {
        const navigation = await client.getSingle<NavigationDocument>('navigation');

        return navigation.data.body.map((item) => ({
            title: item.primary.title!,
            handle: item.primary.handle!,
            children: item.items as any
        }));
    } catch (error: unknown) {
        if (!Locale.isDefault(locale)) {
            return NavigationApi({ shop, locale: Locale.default }); // Try again with default locale.
        }

        if (ApiError.isNotFound(error)) {
            throw new NotFoundError(`"Navigation" with the locale "${locale.code}"`);
        }

        throw error;
    }
};

export const MenuApi = async ({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<MenuDocumentData> => {
    const client = createClient({ shop, locale });

    try {
        const menu = await client.getSingle<MenuDocument>('menu');

        return menu.data;
    } catch (error: unknown) {
        if (!Locale.isDefault(locale)) {
            return MenuApi({ shop, locale: Locale.default }); // Try again with default locale.
        }

        if (ApiError.isNotFound(error)) {
            throw new NotFoundError(`"Menu" with the locale "${locale.code}"`);
        }

        throw error;
    }
};
