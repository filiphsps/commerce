import 'server-only';

import { getHeader } from '@nordcom/commerce-cms/api';
import type { Header } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
import { isDraftModeEnabled } from './_draft';
import { normalizePayloadDoc } from './_normalize-payload';

export type HeaderApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `Header` global for this tenant + locale. Detects draft
 * mode via `next/headers` so editor previews see autosaved drafts; production
 * renders see published only. Returns `null` when the doc has not been seeded —
 * callers render their minimal fallback chrome in that case.
 *
 * Routed through the SFREAD-12 dual-read loader: Mongo stays authoritative,
 * the Convex `cms/read:singleton` shadow compares behind `CMS_READ_SHADOW`,
 * and `CMS_READ_FLIP=header` serves the Convex result. A draft-mode request
 * forwards the draft flag down BOTH legs and skips the shadow.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @returns The normalized header document, or `null` when unseeded.
 */
export async function HeaderApi({ shop, locale }: HeaderApiArgs): Promise<Header | null> {
    const draft = await isDraftModeEnabled();
    return runCmsDualRead<Header | null>({
        getter: 'header',
        shopId: shop.id,
        locale: locale.code,
        draft,
        mongo: async () => {
            const header = await getHeader({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                draft,
            });
            return header ? normalizePayloadDoc(header, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:singleton', {
                shopId: shop.id,
                collection: 'header',
                locale: locale.code,
                ...(draft ? { draft: true } : {}),
            }),
    });
}
