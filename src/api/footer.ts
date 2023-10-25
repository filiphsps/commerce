import { FooterModel } from '@/models/FooterModel';
import { createClient } from '@/prismic';
import { Config } from '@/utils/config';
import { DefaultLocale, type Locale } from '@/utils/locale';
import type { Client as PrismicClient } from '@prismicio/client';

export const FooterApi = async ({
    locale,
    client: _client
}: {
    locale: Locale;
    client?: PrismicClient;
}): Promise<FooterModel> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ locale });
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
            // TODO: isDefaultLocale utility function.
            if (error.message.includes('No documents') && locale.locale !== Config.i18n.default) {
                return resolve(await FooterApi({ locale: DefaultLocale(), client: _client })); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};
