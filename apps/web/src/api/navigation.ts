import type { Shop } from '@/api/shop';
import { buildCacheTagArray } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';
import type { Client as PrismicClient } from '@prismicio/client';
import { unstable_cache as cache } from 'next/cache';

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
    if (shop.contentProvider?.type !== 'prismic') {
        // TODO: Handle non-Prismic content providers.
        return [];
    }

    return cache(
        async (shop: Shop, locale: Locale, _client?: PrismicClient) => {
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
                        return NavigationApi({ shop, locale: Locale.default, client }); // Try again with default locale.
                    }

                    throw new NotFoundError(`"Navigation" with the locale "${locale.code}"`);
                }

                throw error;
            }
        },
        [shop.id, locale.code, 'navigation'],
        {
            tags: buildCacheTagArray(shop, locale, ['navigation']),
            revalidate: 60 * 60 * 8 // 8 hours.
        }
    )(shop, locale, _client);
};
