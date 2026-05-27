import 'server-only';

import { getHeader } from '@nordcom/commerce-cms/api';
import type { Header } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { normalizePayloadDoc } from './_normalize-payload';

export type HeaderApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `Header` global for this tenant + locale. Detects draft
 * mode via `next/headers` so editor previews see autosaved drafts; production
 * renders see published only. Returns `null` when the doc has not been seeded —
 * callers render their minimal fallback chrome in that case.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @returns The normalized header document, or `null` when unseeded.
 */
export async function HeaderApi({ shop, locale }: HeaderApiArgs): Promise<Header | null> {
    const header = await getHeader({
        shop: toShopRef(shop),
        locale: { code: locale.code },
    });
    return header ? normalizePayloadDoc(header, locale.code) : null;
}
