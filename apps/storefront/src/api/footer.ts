import 'server-only';

import type { Footer } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { cmsRead } from './_cms-read';
import { isDraftModeEnabled } from './_draft';

export type FooterApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * Reads the `Footer` singleton for this tenant + locale from the Convex
 * `cms/read:singleton` query. Mirrors HeaderApi's draft-detection and
 * null-on-missing policy.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @returns The contract-shaped footer document, or `null` when the doc has not been seeded.
 */
export async function FooterApi({ shop, locale }: FooterApiArgs): Promise<Footer | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:singleton', {
        shopId: shop.id,
        collection: 'footer',
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as Footer | null;
}
