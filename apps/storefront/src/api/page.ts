import 'server-only';

import type { Page } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import type { CmsPaginatedDocs } from './_cms';
import { cmsRead } from './_cms-read';
import { isDraftModeEnabled } from './_draft';

/** The frozen `PagesApi` paginated envelope the storefront consumes. */
export type PagesApiResult = CmsPaginatedDocs<Page>;

/** The bounded window the pages listing always fetches — one page in practice. */
const PAGES_WINDOW_LIMIT = 1000;

/**
 * Fetches all CMS pages for a tenant from the Convex `cms/read:pages` query —
 * one bounded read per window, up to 1000 results. The Convex read returns
 * docs only; the single-window pagination envelope the 1000-doc fetch always
 * produces in practice is reconstructed here so the SFREAD-01 list contract
 * stays byte-identical.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @returns The contract-shaped page list result.
 */
export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<PagesApiResult> {
    const { docs } = (await cmsRead('cms/read:pages', { shopId: shop.id, locale: locale.code })) as {
        docs: Page[];
    };
    return {
        docs,
        totalDocs: docs.length,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasNextPage: false,
        hasPrevPage: false,
        limit: PAGES_WINDOW_LIMIT,
        nextPage: null,
        prevPage: null,
    };
}

/**
 * Fetches a single CMS page by its slug for a tenant and locale from the
 * Convex `cms/read:pageBySlug` query. In draft mode (the CMS preview iframe;
 * toggled by `api/cms-preview`) the draft flag rides the read so autosaved
 * drafts serve.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @param options.handle - Page slug to look up.
 * @returns The contract-shaped page document, or `null` when no page exists for the slug.
 */
export async function PageApi({
    shop,
    locale,
    handle,
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
}): Promise<Page | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:pageBySlug', {
        shopId: shop.id,
        slug: handle,
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as Page | null;
}
