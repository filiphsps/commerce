import { captureException } from '@sentry/nextjs';

import { createClient } from 'prismicio';
import { i18n } from '../../next-i18next.config.cjs';

export const FooterApi = async ({ locale }: { locale?: string }) => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = i18n.locales[1];

        const client = createClient({});
        try {
            const res = await client.getSingle('footer', {
                lang: locale
            });

            return resolve({
                address: res.data.address,
                show_language_selector: res.data.show_language_selector,
                show_currency_selector: res.data.show_currency_selector,
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
