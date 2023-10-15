import { Config } from 'src/util/Config';
import { FooterModel } from 'src/models/FooterModel';
import { createClient } from 'prismicio';

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
        } catch (error) {
            if (error.message.includes('No documents') && locale !== Config.i18n.default) {
                return resolve(await FooterApi({})); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};
