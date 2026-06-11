import 'server-only';

import type { Header } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { cmsRead } from './_cms-read';
import { isDraftModeEnabled } from './_draft';

export type HeaderApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the `Header` singleton for this tenant + locale from the Convex
 * `cms/read:singleton` query — the authoritative (and since TEARDOWN-02 the
 * only) backend. Detects draft mode via `next/headers` so editor previews see
 * autosaved drafts; production renders see published only. Returns `null`
 * when the doc has not been seeded — callers render their minimal fallback
 * chrome in that case.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @returns The contract-shaped header document, or `null` when unseeded.
 */
export async function HeaderApi({ shop, locale }: HeaderApiArgs): Promise<Header | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:singleton', {
        shopId: shop.id,
        collection: 'header',
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as Header | null;
}
