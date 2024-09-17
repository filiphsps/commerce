import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

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

    try {
        const menu = await client.getSingle<MenuDocument>('menu');

        return menu.data;
    } catch (error: unknown) {
        const locale = Locale.from(client.defaultParams?.lang!); // Actually used locale.
        if (!Locale.isDefault(locale)) {
            return MenuApi({ shop, locale: Locale.default }); // Try again with default locale.
        }

        if (Error.isNotFound(error)) {
            throw new NotFoundError(`"Menu" with the locale "${locale.code}"`);
        }

        throw error;
    }
};

export async function HeaderApi({
    shop,
    locale
}: {
    shop: OnlineShop;
    locale: Locale;
}): Promise<HeaderDocumentData | null> {
    const client = createClient({ shop, locale });

    try {
        const header = await client.getSingle<HeaderDocument>('header');

        return header.data;
    } catch (error: unknown) {
        const locale = Locale.from(client.defaultParams?.lang!); // Actually used locale.
        if (Error.isNotFound(error) && !Locale.isDefault(locale)) {
            return await HeaderApi({ shop, locale: Locale.default }); // Try again with default locale.
        }

        return null;
    }
}
