import * as Sentry from '@sentry/nextjs';

import { HeaderModel } from '../models/HeaderModel';
import { createClient } from 'prismicio';
import { i18n } from '../../next-i18next.config.cjs';

export const HeaderApi = async (locale = i18n.defaultLocale): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        const client = createClient({});

        try {
            const res = await client.getSingle('head', {
                lang: locale === 'x-default' ? i18n.locales[1] : locale
            });
            return resolve(res.data as any as HeaderModel);
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
