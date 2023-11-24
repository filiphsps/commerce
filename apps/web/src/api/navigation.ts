import type { Shop } from '@/api/shop';
import { ApiError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import type { Client as PrismicClient } from '@prismicio/client';

export type NavigationItem = {
    title: string;
    handle?: string;
    description?: string;
    children: Array<{
        title: string;
        handle?: string;
    }>;
};

export const NavigationApi = async ({
    shop,
    locale,
    client: _client
}: {
    shop: Shop;
    locale: Locale;
    client?: PrismicClient;
}): Promise<NavigationItem[]> => {
    const client = _client || createClient({ shop, locale });

    try {
        const navigation = await client.getSingle('navigation', {
            lang: locale.code
        });

        return (navigation?.data?.body as any)?.map((item: any) => ({
            title: item.primary.title,
            handle: item.primary.handle,
            children: item.items
        }));
    } catch (error: unknown) {
        if (ApiError.isNotFound(error)) {
            if (!Locale.isDefault(locale)) {
                return await NavigationApi({ shop, locale: Locale.default, client }); // Try again with default locale
            }

            throw new Error(`404: "Navigation" with the locale "${locale.code}" cannot be found`);
        }

        throw error;
    }
};
