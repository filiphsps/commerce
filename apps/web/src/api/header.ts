import type { Shop } from '@/api/shop';
import type { HeaderModel } from '@/models/HeaderModel';
import { DefaultLocale, isDefaultLocale, type Locale } from '@/utils/locale';
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
        } catch (error: any) {
            if (error.message.includes('No documents')) {
                if (!isDefaultLocale(locale)) {
                    return resolve(await HeaderApi({ shop, locale: DefaultLocale(), client })); // Try again with default locale
                }

                return reject(new Error(`404: "Header" with the locale "${locale.code}" cannot be found`));
            }

            console.error(error);
            return reject(error);
        }
    });
};
