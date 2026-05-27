import 'server-only';

import { getPage as CmsGetPage, getPages as CmsGetPages } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { normalizePayloadDoc } from './_normalize-payload';

/**
 * Fetches all CMS pages for a tenant, up to 1000 results.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @returns Normalized Payload page list result.
 */
export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    const result = await CmsGetPages({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        limit: 1000,
    });
    return normalizePayloadDoc(result, locale.code);
}

/**
 * Fetches a single CMS page by its slug for a tenant and locale.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.handle - Page slug to look up.
 * @returns The normalized page document, or `null` when no page exists for the slug.
 */
export async function PageApi({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const page = await CmsGetPage({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        slug: handle,
    });

    return page ? normalizePayloadDoc(page, locale.code) : null;
}
