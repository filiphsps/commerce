import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';
import { unstable_cache } from 'next/cache';

import type { FooterDocument } from '@/prismic/types';

export async function FooterApi({
    shop,
    locale
}: {
    shop: OnlineShop;
    locale: Locale;
}): Promise<FooterDocument['data']> {
    const client = createClient({ shop, locale });

    return unstable_cache(
        async () => {
            try {
                const footer = await client.getSingle<FooterDocument>('footer');

                return footer.data;
            } catch (error: unknown) {
                const _locale = Locale.from(client.defaultParams?.lang!) || locale;

                if (Error.isNotFound(error)) {
                    if (!Locale.isDefault(_locale)) {
                        return await FooterApi({ shop, locale: Locale.default }); // Try again with default locale.
                    }

                    throw new NotFoundError(`"Footer" with the locale "${locale.code}"`);
                }

                // TODO: Deal with errors properly.
                console.error(error);
                throw error;
            }
        },
        [
            shop.domain,
            Locale.default.code // TODO: This should be the actual locale, but we're calling prismic.io's API way too much.
            /* locale.code */
        ],
        {
            revalidate: 86_400, // 24hrs.
            tags: ['prismic', shop.domain, locale.code]
        }
    )();
}
