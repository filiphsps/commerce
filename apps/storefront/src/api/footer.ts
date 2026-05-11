import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';
import { unstable_cache } from 'next/cache';
import type { FooterDocument } from '@/prismic/types';
import { Locale } from '@/utils/locale';
import { buildPrismicCacheTags, createClient } from '@/utils/prismic';

export async function FooterApi({
    shop,
    locale,
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
                const _locale = client.defaultParams?.lang ? Locale.from(client.defaultParams.lang) : locale;

                if (Error.isNotFound(error)) {
                    if (!Locale.isDefault(_locale)) {
                        return await FooterApi({ shop, locale: Locale.fallbackForShop(shop) }); // Try again with default locale.
                    }

                    throw new NotFoundError(`"Footer" with the locale "${locale.code}"`);
                }

                // TODO: Deal with errors properly.
                console.error(error);
                throw error;
            }
        },
        [shop.domain, locale.code, 'footer'],
        {
            revalidate: 86_400, // 24hrs.
            tags: buildPrismicCacheTags({ shop, locale, doc: { type: 'footer', uid: 'footer' } }),
        },
    )();
}
