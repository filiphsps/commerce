import type { HeaderModel } from '@/models/HeaderModel';
import { createClient } from '@/prismic';
import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale, type Locale } from '@/utils/locale';
import type { Client as PrismicClient } from '@prismicio/client';

export const HeaderApi = async ({
    locale,
    client: _client
}: {
    locale: Locale;
    client?: PrismicClient;
}): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ locale });
        try {
            const res = await client.getSingle('head', {
                lang: locale.locale
            });
            return resolve(res.data as any as HeaderModel);
        } catch (error: any) {
            // TODO: isDefaultLocale utility function.
            if (error.message.includes('No documents')) {
                if (error.message.includes('No documents') && locale.locale !== BuildConfig.i18n.default) {
                    return resolve(await HeaderApi({ locale: DefaultLocale(), client: _client })); // Try again with default locale
                }

                return reject(new Error('404: The requested document cannot be found'));
            }

            console.error(error);
            return reject(error);
        }
    });
};
