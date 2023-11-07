import { createClient } from '@/prismic';
import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale, type Locale } from '@/utils/locale';
import type { Client as PrismicClient } from '@prismicio/client';

export type NavigationItem = {
    title: string;
    handle?: string;
    description?: string;
    children: Array<{
        title: string;
        handle?: string;
    }>;
};

// TODO: Migrate to `Locale` type.
export const NavigationApi = async ({
    locale,
    client: _client
}: {
    locale: Locale;
    client?: PrismicClient;
}): Promise<NavigationItem[]> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ locale });

        try {
            const navigation = await client.getSingle('navigation', {
                lang: locale.locale
            });

            return resolve(
                (navigation?.data?.body as any)?.map((item: any) => ({
                    title: item.primary.title,
                    handle: item.primary.handle,
                    children: item.items
                }))
            );
        } catch (error: any) {
            // TODO: `isDefaultLocale` utility function.
            if (error.message.includes('No documents') && locale.locale !== BuildConfig.i18n.default) {
                return resolve(await NavigationApi({ locale: DefaultLocale(), client: _client })); // Try again with default locale
            }

            console.error(error);
            return reject(error);
        }
    });
};
