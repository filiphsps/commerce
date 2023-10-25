import { FooterModel } from '@/models/FooterModel';
import { createClient } from '@/prismic';
import { Config } from '@/utils/config';

// TODO: Migrate to `Locale` type.
export const FooterApi = async ({ locale }: { locale?: string }): Promise<FooterModel> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const client = createClient({});
        try {
            const res = await client.getSingle('footer', {
                lang: locale
            });

            return resolve({
                address: res.data.address,
                blocks: res.data.body.map((item) => ({
                    title: item.primary.title,
                    items: item.items
                }))
            });
        } catch (error: any) {
            if (error.message.includes('No documents') && locale !== Config.i18n.default) {
                return resolve(await FooterApi({})); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};
