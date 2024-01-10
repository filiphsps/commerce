import type { HeaderModel } from '@/models/HeaderModel';
import { buildCacheTagArray } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import type { Shop } from '@nordcom/commerce-database';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';
import type { Client as PrismicClient } from '@prismicio/client';
import { unstable_cache as cache } from 'next/cache';

export const HeaderApi = async ({
    shop,
    locale,
    client: _client
}: {
    shop: Shop;
    locale: Locale;
    client?: PrismicClient;
}): Promise<HeaderModel> => {
    if (shop.contentProvider?.type !== 'prismic') {
        // TODO: Handle non-Prismic content providers.
        return {
            announcements: []
        };
    }

    return cache(
        async (shop: Shop, locale: Locale, _client?: PrismicClient) => {
            const client = _client || createClient({ shop, locale });

            try {
                const res = await client.getSingle('head', {
                    lang: locale.code
                });

                return res.data as any as HeaderModel;
            } catch (error: unknown) {
                if (ApiError.isNotFound(error)) {
                    if (!Locale.isDefault(locale)) {
                        return HeaderApi({ shop, locale: Locale.default, client }); // Try again with default locale.
                    }

                    throw new NotFoundError(`"Header" with the locale "${locale.code}"`);
                }

                throw error;
            }
        },
        [shop.id, locale.code, 'header'],
        {
            tags: buildCacheTagArray(shop, locale, ['header']),
            revalidate: 60 * 60 * 8 // 8 hours.
        }
    )(shop, locale, _client);
};
