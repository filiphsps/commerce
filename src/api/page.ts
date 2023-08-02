import * as prismic from '@prismicio/client';

import { captureException } from '@sentry/nextjs';
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

            // TODO: remove filter when we have migrated the shop page
            const paths = pages
                .map((page) => prismic.asLink(page))
                .filter((i) => i && !['/shop', '/countries', '/search', '/cart'].includes(i));
            return resolve({
                paths: paths as any
            });
        } catch (error) {
            if (error.message.includes('No documents') && locale !== i18n.locales[1]) {
                return resolve(await PagesApi({})); // Try again with default locale
            }

            captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
