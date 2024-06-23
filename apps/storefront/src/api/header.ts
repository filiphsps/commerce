import type { Shop } from '@nordcom/commerce-database';
import { ApiError, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import type { HeaderModel } from '@/models/HeaderModel';

export const HeaderApi = async ({ shop, locale }: { shop: Shop; locale: Locale }): Promise<HeaderModel> => {
    const client = createClient({ shop, locale });

    try {
        const res = await client.getSingle('head', {
            lang: locale.code
        });

        return res.data as any as HeaderModel;
    } catch (error: unknown) {
        if (ApiError.isNotFound(error)) {
            if (!Locale.isDefault(locale)) {
                return HeaderApi({ shop, locale: Locale.default }); // Try again with default locale.
            }

            throw new NotFoundError(`"Header" with the locale "${locale.code}"`);
        }

        throw error;
    }
};
