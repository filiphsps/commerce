import * as Sentry from '@sentry/nextjs';

import { Config } from '../util/Config';
import { prismic } from './prismic';

export const FooterApi = async (locale = Config.i18n.locales[0]) => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await prismic().getSingle('footer', {
                lang: locale === '__default' ? Config.i18n.locales[0] : locale
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
            if (
                error.message.includes('No documents') &&
                locale !== Config.i18n.locales[0]
            ) {
                return resolve(await FooterApi()); // Try again with default locale
            }

            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
