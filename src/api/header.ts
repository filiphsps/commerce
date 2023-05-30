import * as Sentry from '@sentry/nextjs';

import { Config } from '../util/Config';
import { prismic } from './prismic';

export const HeaderApi = async (locale = Config.i18n.locales[0]) => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await prismic().getSingle('head', {
                lang: locale === '__default' ? Config.i18n.locales[0] : locale
            });

            return resolve(res.data);
        } catch (error) {
            if (
                error.message.includes('No documents') &&
                locale !== Config.i18n.locales[0]
            ) {
                return resolve(await HeaderApi()); // Try again with default locale
            }

            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
