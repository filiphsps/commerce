import * as Sentry from '@sentry/nextjs';

import { prismic } from './prismic';

export const PagesApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const pages = await prismic().getAllByType('page');

            return resolve(pages.map((page) => page.uid).filter((page) => page !== 'homepage'));
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
