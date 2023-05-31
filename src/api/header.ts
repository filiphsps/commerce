import * as Sentry from '@sentry/nextjs';

import { Config } from '../util/Config';
import { HeaderModel } from '../models/HeaderModel';
import { prismic } from './prismic';

export const HeaderApi = async (
    locale = Config.i18n.locales[0]
): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await prismic().getSingle('head', {
                lang: locale === '__default' ? Config.i18n.locales[0] : locale
            });
            return resolve(res.data as HeaderModel);
        } catch (error) {
            if (error.message.includes('No documents')) {
                if (locale !== Config.i18n.locales[0]) {
                    return resolve(await HeaderApi()); // Try again with default locale
                }

                return reject(
                    new Error('404: The requested document cannot be found')
                );
            }

            Sentry.captureException(error);
            return reject(error);
        }
    });
};
