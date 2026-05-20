import 'server-only';

import { getFooter } from '@nordcom/commerce-cms/api';
import type { Footer } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import { draftMode } from 'next/headers';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type FooterApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `Footer` global for this tenant + locale. Mirrors the
 * draft-detection + null-on-missing policy of HeaderApi.
 */
export async function FooterApi({ shop, locale }: FooterApiArgs): Promise<Footer | null> {
    const isDraft = (await draftMode()).isEnabled;
    return getFooter({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        draft: isDraft,
    });
}
