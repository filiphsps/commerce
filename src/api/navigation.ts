import * as Sentry from '@sentry/nextjs';

import { i18n } from '../../next-i18next.config.cjs';
import { prismic } from './prismic';

export const NavigationApi = async (
    locale = i18n.defaultLocale
): Promise<
    Array<{
        title: string;
        handle?: string;
        children: Array<{
            title: string;
            handle?: string;
        }>;
    }>
> => {
    return new Promise(async (resolve, reject) => {
        try {
            const navigation = await prismic().getSingle('navigation', {
                lang: locale === 'x-default' ? i18n.locales[1] : locale
            });

            return resolve(
                (navigation?.data?.body as any)?.map((item) => ({
                    title: item.primary.title,
                    handle: item.primary.handle,
                    children: item.items
                }))
            );
        } catch (error) {
            if (error.message.includes('No documents') && locale !== i18n.locales[1]) {
                return resolve(await NavigationApi()); // Try again with default locale
            }

            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
