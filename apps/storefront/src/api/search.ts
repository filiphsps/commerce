import 'server-only';

import type { Search } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { cmsRead } from './_cms-read';
import { isDraftModeEnabled } from './_draft';

export type SearchApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the `Search` singleton (the search-landing configuration) for this tenant + locale from the
 * Convex `cms/read:singleton` query. Mirrors `FooterApi`'s draft-detection and null-on-missing
 * policy; an unseeded tenant resolves to `null` and the storefront falls back to its platform-default
 * landing.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @returns The contract-shaped search document, or `null` when the doc has not been seeded.
 */
export async function SearchApi({ shop, locale }: SearchApiArgs): Promise<Search | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:singleton', {
        shopId: shop.id,
        collection: 'search',
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as Search | null;
}
