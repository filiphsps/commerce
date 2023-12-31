import type { Shop } from '@/api/shop';
import type { FooterModel } from '@/models/FooterModel';
import { ApiError, NotFoundError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import type { Client as PrismicClient } from '@prismicio/client';

export const FooterApi = async ({
    shop,
    locale,
    client: _client
}: {
    shop: Shop;
    locale: Locale;
    client?: PrismicClient;
}): Promise<FooterModel> => {
    if (shop.contentProvider?.type !== 'prismic') {
        // TODO: Handle non-Prismic content providers.
        return {
            address: '',
            blocks: []
        };
    }

    const client = _client || createClient({ shop, locale });

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
                return await FooterApi({ shop, locale: Locale.default, client }); // Try again with default locale
            }

            throw new NotFoundError(`"Footer" with the locale "${locale.code}"`);
        }

        throw error;
    }
};
