import 'server-only';

import { getFooter } from '@nordcom/commerce-cms/api';
import type { Footer } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { normalizePayloadDoc } from './_normalize-payload';

export type FooterApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `Footer` global for this tenant + locale. Mirrors the
 * draft-detection + null-on-missing policy of HeaderApi.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @returns The normalized footer document, or `null` when the doc has not been seeded.
 */
export async function FooterApi({ shop, locale }: FooterApiArgs): Promise<Footer | null> {
    const footer = await getFooter({
        shop: toShopRef(shop),
        locale: { code: locale.code },
    });
    return footer ? normalizePayloadDoc(footer, locale.code) : null;
}
