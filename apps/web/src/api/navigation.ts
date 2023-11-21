import type { Shop } from '@/api/shop';
import { createClient } from '@/prismic';
import { DefaultLocale, isDefaultLocale, type Locale } from '@/utils/locale';
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

export const NavigationApi = async ({
    shop,
    locale,
    client: _client
}: {
    shop: Shop;
    locale: Locale;
    client?: PrismicClient;
}): Promise<NavigationItem[]> => {
    return new Promise(async (resolve, reject) => {
        const client = _client || createClient({ shop, locale });

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
            if (error.message.includes('No documents')) {
                if (!isDefaultLocale(locale)) {
                    return resolve(await NavigationApi({ shop, locale: DefaultLocale(), client })); // Try again with default locale
                }

                return reject(new Error(`404: "Navigation" with the locale "${locale.locale}" cannot be found`));
            }

            console.error(error);
            return reject(error);
        }
    });
};
