import * as prismic from '@prismicio/client';

import { Config } from 'src/util/Config';
import { createClient } from '../../prismicio';

export const PagesApi = async ({
    locale
}: {
    locale?: string;
}): Promise<{
    paths: string[];
}> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

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
            if (error.message.includes('No documents') && locale !== Config.i18n.default) {
                return resolve(await PagesApi({})); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};
