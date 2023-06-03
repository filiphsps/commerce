import * as Sentry from '@sentry/nextjs';

import { Config } from '../util/Config';
import { PageModel } from '../models/PageModel';
import { prismic } from './prismic';

export const PageApi = async (
    handle: string,
    locale = Config.i18n.locales[0]
): Promise<PageModel> => {
    return new Promise(async (resolve, reject) => {
        try {
            const page = await prismic().getByUID('page', handle, {
                lang: locale === '__default' ? Config.i18n.locales[0] : locale
            });

            return resolve(page?.data as PageModel);
        } catch (error) {
            if (error.message.includes('No documents')) {
                if (locale !== Config.i18n.locales[0]) {
                    return resolve(await PageApi(handle)); // Try again with default locale
                }

                return reject(new Error('404: The requested document cannot be found'));
            }

            Sentry.captureException(error);
            return reject(error);
        }
    });
};

export const PagesApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const pages = await prismic().getAllByType('page');

            return resolve(pages.map((page) => page.uid).filter((page) => page !== 'home'));
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
