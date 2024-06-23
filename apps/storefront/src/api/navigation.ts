import type { OnlineShop } from '@nordcom/commerce-db';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type { Image } from '@/api/nordcom';
import type { NavigationDocument } from '@/prismic/types';

export type NavigationItem = {
    title: string;
    handle?: string;
    description?: string;
    children: Array<{
        title: string;
        handle?: string;
    }>;
};

export type ThirdLevelMenuEntry = {
    id: string;

    url: string;
    title: string;
    description?: string;
    image?: Image;
};
export type SecondLevelMenuEntry = {
    id: string;

    url?: string;
    title: string;
    description?: string;
    image?: Image;
    children: ThirdLevelMenuEntry[];
};
export type TopLevelMenuEntry = {
    id: string;

    url?: string;
    title: string;
    children: SecondLevelMenuEntry[];
};

export type MegaMenuBase = {
    children: TopLevelMenuEntry[];
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
        const navigation = await client.getSingle<NavigationDocument>('navigation', {
            lang: locale.code.toLowerCase()
        });

        return navigation.data.body.map((item) => ({
            title: item.primary.title!,
            handle: item.primary.handle!,
            children: item.items as any
        }));
    } catch (error: unknown) {
        if (ApiError.isNotFound(error)) {
            if (!Locale.isDefault(locale)) {
                return NavigationApi({ shop, locale: Locale.default }); // Try again with default locale.
            }

            throw new NotFoundError(`"Navigation" with the locale "${locale.code}"`);
        }

        throw error;
    }
};
