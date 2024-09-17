import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type { FooterDocument } from '@/prismic/types';

export async function FooterApi({
    shop,
    locale
}: {
    shop: OnlineShop;
    locale: Locale;
}): Promise<FooterDocument['data']> {
    const client = createClient({ shop, locale });

    try {
        const res = await client.getSingle<FooterDocument>('footer');

        return res.data;
    } catch (error: unknown) {
        const locale = Locale.from(client.defaultParams?.lang!); // Actually used locale.
        if (Error.isNotFound(error)) {
            if (!Locale.isDefault(locale)) {
                return await FooterApi({ shop, locale: Locale.default }); // Try again with default locale.
            }

            throw new NotFoundError(`"Footer" with the locale "${locale.code}"`);
        }

        // TODO: Deal with errors properly.
        console.error(error);
        throw error;
    }
}
