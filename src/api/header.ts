import { Config } from 'src/util/Config';
import type { HeaderModel } from '../models/HeaderModel';
import { captureException } from '@sentry/nextjs';
import { createClient } from 'prismicio';

export const HeaderApi = async (locale = Config.i18n.default): Promise<HeaderModel> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const client = createClient({});
        try {
            const res = await client.getSingle('head', {
                lang: locale
            });
            return resolve(res.data as any as HeaderModel);
        } catch (error) {
            if (error.message.includes('No documents')) {
                if (locale !== Config.i18n.default) {
                    return resolve(await HeaderApi()); // Try again with default locale
                }

                return reject(new Error('404: The requested document cannot be found'));
            }

            captureException(error);
            return reject(error);
        }
    });
};
