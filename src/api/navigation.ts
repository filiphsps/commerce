import { Config } from 'src/util/Config';
import { captureException } from '@sentry/nextjs';
import { createClient } from 'prismicio';

export type NavigationItem = {
    title: string;
    handle?: string;
    children: Array<{
        title: string;
        handle?: string;
    }>;
};
export const NavigationApi = async ({ locale }: { locale?: string }): Promise<NavigationItem[]> => {
    return new Promise(async (resolve, reject) => {
        if (!locale || locale === 'x-default') locale = Config.i18n.default;

        const client = createClient({});

        try {
            const navigation = await client.getSingle('navigation', {
                lang: locale
            });

            return resolve(
                (navigation?.data?.body as any)?.map((item) => ({
                    title: item.primary.title,
                    handle: item.primary.handle,
                    children: item.items
                }))
            );
        } catch (error) {
            if (error.message.includes('No documents') && locale !== Config.i18n.default) {
                return resolve(await NavigationApi({})); // Try again with default locale
            }

            captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
