import { unstable_cache as cache } from 'next/cache';

import type { Shop } from '@nordcom/commerce-database';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';

import { buildCacheTagArray } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type { FooterModel } from '@/models/FooterModel';

export const FooterApi = async ({ shop, locale }: { shop: Shop; locale: Locale }): Promise<FooterModel> => {
    const client = createClient({ shop, locale });

    return cache(
        async (shop: Shop, locale: Locale) => {
            try {
                const res = await client.getSingle('footer', {
                    lang: locale.code
                });

                return {
                    address: res.data.address,
                    blocks: res.data.body.map((item: any) => ({
                        title: item.primary.title,
                        items: item.items
                    }))
                };
            } catch (error: unknown) {
                if (ApiError.isNotFound(error)) {
                    if (!Locale.isDefault(locale)) {
                        return FooterApi({ shop, locale: Locale.default });
                    }

                    throw new NotFoundError(`"Footer" with the locale "${locale.code}"`);
                }

                throw error;
            }
        },
        [shop.id, locale.code, 'footer'],
        {
            tags: buildCacheTagArray(shop, locale, ['footer']),
            revalidate: 60 * 60 * 8 // 8 hours.
        }
    )(shop, locale);
};
