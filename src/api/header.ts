import * as Sentry from '@sentry/nextjs';

import { HeaderModel } from '../models/HeaderModel';
import { i18n } from '../../next-i18next.config.cjs';
import { prismic } from './prismic';

export const HeaderApi = async (locale = i18n.defaultLocale): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await prismic().getSingle('head', {
                lang: locale === 'x-default' ? i18n.locales[1] : locale
            });
            return resolve(res.data as HeaderModel);
        } catch (error) {
            if (error.message.includes('No documents')) {
                if (locale !== i18n.locales[1]) {
                    return resolve(await HeaderApi()); // Try again with default locale
                }

                return reject(new Error('404: The requested document cannot be found'));
            }

            Sentry.captureException(error);
            return reject(error);
        }
    });
};
