import 'server-only';

import { getHeader } from '@nordcom/commerce-cms/api';
import type { Header } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type HeaderApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the Payload `Header` global for this tenant + locale. Detects draft
 * mode via `next/headers` so editor previews see autosaved drafts; production
 * renders see published only. Returns `null` when the doc has not been seeded —
 * callers render their minimal fallback chrome in that case.
 */
export async function HeaderApi({ shop, locale }: HeaderApiArgs): Promise<Header | null> {
    return getHeader({
        shop: toShopRef(shop),
        locale: { code: locale.code },
    });
}
