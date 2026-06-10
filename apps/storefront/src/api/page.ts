import 'server-only';

import { getPage as CmsGetPage, getPages as CmsGetPages } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
import { isDraftModeEnabled } from './_draft';
import { normalizePayloadDoc } from './_normalize-payload';

/** The frozen `getPages` paginated envelope the storefront consumes. */
type PagesApiResult = Awaited<ReturnType<typeof CmsGetPages>>;

/**
 * Orders contract-shaped docs by slug so the dual-read comparator sees the same sequence from both
 * backends regardless of each backend's native sort.
 *
 * @param docs - Contract-shaped documents carrying a `slug`.
 * @returns A new slug-ordered array.
 */
const bySlug = <T extends { slug?: string | null }>(docs: readonly T[]): T[] =>
    [...docs].sort((a, b) => (a.slug ?? '').localeCompare(b.slug ?? ''));

/**
 * Fetches all CMS pages for a tenant, up to 1000 results. Routed through the
 * SFREAD-12 dual-read loader (`CMS_READ_SHADOW` shadow, `CMS_READ_FLIP=pages`);
 * the shadow compares the slug-ordered doc lists only — the pagination meta is
 * envelope bookkeeping, not content.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @returns Normalized Payload page list result.
 */
export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<PagesApiResult> {
    return runCmsDualRead<PagesApiResult>({
        getter: 'pages',
        shopId: shop.id,
        locale: locale.code,
        mongo: async () => {
            const result = await CmsGetPages({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                limit: 1000,
            });
            return normalizePayloadDoc(result, locale.code);
        },
        convex: (query) => query('cms/read:pages', { shopId: shop.id, locale: locale.code }),
        project: (result) => ({ docs: bySlug(result.docs) }),
        // The Convex read returns docs only; the flip path reconstructs the single-window
        // pagination envelope the 1000-doc fetch always produces in practice.
        fromConvex: (value) => {
            const docs = (value as { docs: PagesApiResult['docs'] }).docs;
            return {
                docs,
                totalDocs: docs.length,
                totalPages: 1,
                page: 1,
                pagingCounter: 1,
                hasNextPage: false,
                hasPrevPage: false,
                limit: 1000,
                nextPage: null,
                prevPage: null,
            } as PagesApiResult;
        },
    });
}

/**
 * Fetches a single CMS page by its slug for a tenant and locale. Routed through
 * the SFREAD-12 dual-read loader (`CMS_READ_SHADOW` shadow, `CMS_READ_FLIP=page`).
 * In draft mode (the CMS preview iframe; toggled by `api/cms-preview`) the draft
 * flag travels down BOTH legs — Payload's `draft: true` find and the Convex
 * `cms/read:pageBySlug` draft variant — and the shadow comparison is skipped.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.handle - Page slug to look up.
 * @returns The normalized page document, or `null` when no page exists for the slug.
 */
export async function PageApi({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const draft = await isDraftModeEnabled();
    return runCmsDualRead<Awaited<ReturnType<typeof CmsGetPage>>>({
        getter: 'page',
        shopId: shop.id,
        locale: locale.code,
        key: handle,
        draft,
        mongo: async () => {
            const page = await CmsGetPage({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                slug: handle,
                draft,
            });
            return page ? normalizePayloadDoc(page, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:pageBySlug', {
                shopId: shop.id,
                slug: handle,
                locale: locale.code,
                ...(draft ? { draft: true } : {}),
            }),
    });
}
