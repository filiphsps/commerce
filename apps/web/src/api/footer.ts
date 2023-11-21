import type { Shop } from '@/api/shop';
import type { FooterModel } from '@/models/FooterModel';
import { createClient } from '@/prismic';
import { DefaultLocale, isDefaultLocale, type Locale } from '@/utils/locale';
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
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ shop, locale });

        try {
            const res = await client.getSingle('footer', {
                lang: locale.locale
            });

            return resolve({
                address: res.data.address,
                blocks: res.data.body.map((item: any) => ({
                    title: item.primary.title,
                    items: item.items
                }))
            });
        } catch (error: any) {
            if (error.message.includes('No documents')) {
                if (!isDefaultLocale(locale)) {
                    return resolve(await FooterApi({ shop, locale: DefaultLocale(), client })); // Try again with default locale
                }

                return reject(new Error(`404: "Footer" with the locale "${locale.locale}" cannot be found`));
            }

            console.error(error);
            return reject(error);
        }
    });
};
