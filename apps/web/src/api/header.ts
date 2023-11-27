import type { Shop } from '@/api/shop';
import type { HeaderModel } from '@/models/HeaderModel';
import { ApiError, NotFoundError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import type { Client as PrismicClient } from '@prismicio/client';

export const HeaderApi = async ({
    shop,
    locale,
    client: _client
}: {
    shop: Shop;
    locale: Locale;
    client?: PrismicClient;
}): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ shop, locale });

        try {
            const res = await client.getSingle('head', {
                lang: locale.code
            });
            return resolve(res.data as any as HeaderModel);
        } catch (error: unknown) {
            if (ApiError.isNotFound(error)) {
                if (!Locale.isDefault(locale)) {
                    return resolve(await HeaderApi({ shop, locale: Locale.default, client })); // Try again with default locale
                }

                return reject(new NotFoundError(`"Header" with the locale "${locale.code}"`));
            }

            console.error(error);
            return reject(error);
        }
    });
};
