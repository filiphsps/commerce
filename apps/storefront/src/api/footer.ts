import type { OnlineShop } from '@nordcom/commerce-db';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';

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
        if (ApiError.isNotFound(error)) {
            if (!Locale.isDefault(locale)) {
                return FooterApi({ shop, locale: Locale.default });
            }

            throw new NotFoundError(`"Footer" with the locale "${locale.code}"`);
        }

        throw error;
    }
}
