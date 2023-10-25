import type { HeaderModel } from '@/models/HeaderModel';
import { createClient } from '@/prismic';
import { Config } from '@/utils/config';

// TODO: Migrate to `Locale` type.
export const HeaderApi = async ({ locale }: { locale?: string }): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const client = createClient({});
        try {
            const res = await client.getSingle('head', {
                lang: locale
            });
            return resolve(res.data as any as HeaderModel);
        } catch (error: any) {
            if (error.message.includes('No documents')) {
                if (locale !== Config.i18n.default) {
                    return resolve(await HeaderApi({})); // Try again with default locale
                }

                return reject(new Error('404: The requested document cannot be found'));
            }

            console.error(error);
            return reject(error);
        }
    });
};
