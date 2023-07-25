import { captureException } from '@sentry/nextjs';

import { createClient } from 'prismicio';
import { FooterModel } from 'src/models/FooterModel';
import { i18n } from '../../next-i18next.config.cjs';

export const FooterApi = async ({ locale }: { locale?: string }): Promise<FooterModel> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = i18n.locales[1];

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
            if (error.message.includes('No documents') && locale !== i18n.locales[1]) {
                return resolve(await FooterApi({})); // Try again with default locale
            }

            captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
