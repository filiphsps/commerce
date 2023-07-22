import * as Sentry from '@sentry/nextjs';
import * as prismic from '@prismicio/client';

import { createClient } from 'prismicio';
import { i18n } from '../../next-i18next.config.cjs';

export const PagesApi = async ({
    locale
}: {
    locale?: string;
}): Promise<{
    paths: string[];
}> => {
    return new Promise(async (resolve, reject) => {
        if (locale === 'x-default') locale = i18n.locales[1];

        try {
            const client = createClient({});
            const pages = await client.getAllByType('custom_page', {
                lang: locale
            });

            if (!pages) return reject();

            const paths = pages.map((page) => prismic.asLink(page));
            return resolve({
                paths: paths as any
            });
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
