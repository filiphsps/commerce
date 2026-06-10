import 'server-only';

import { getFooter } from '@nordcom/commerce-cms/api';
import type { Footer } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
import { isDraftModeEnabled } from './_draft';
import { normalizePayloadDoc } from './_normalize-payload';

export type FooterApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `Footer` global for this tenant + locale. Mirrors the
 * draft-detection + null-on-missing policy of HeaderApi, and rides the same
 * SFREAD-12 dual-read loader (`CMS_READ_SHADOW` shadow, `CMS_READ_FLIP=footer`).
 * A draft-mode request forwards the draft flag down BOTH legs and skips the shadow.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @returns The normalized footer document, or `null` when the doc has not been seeded.
 */
export async function FooterApi({ shop, locale }: FooterApiArgs): Promise<Footer | null> {
    const draft = await isDraftModeEnabled();
    return runCmsDualRead<Footer | null>({
        getter: 'footer',
        shopId: shop.id,
        locale: locale.code,
        draft,
        mongo: async () => {
            const footer = await getFooter({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                draft,
            });
            return footer ? normalizePayloadDoc(footer, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:singleton', {
                shopId: shop.id,
                collection: 'footer',
                locale: locale.code,
                ...(draft ? { draft: true } : {}),
            }),
    });
}
