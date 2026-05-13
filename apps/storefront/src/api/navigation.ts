import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

/**
 * Legacy Prismic-shaped header/menu data types. Retained as `unknown` to keep
 * source compatibility with header components during the CMS migration. The
 * Prismic backend has been removed; both APIs return null until the new CMS
 * Header global is wired into the storefront header components.
 *
 * Follow-up: replace these call sites with `getHeader` from
 * @nordcom/commerce-cms/api and the Header global's recursive nav-item field.
 */
export type LegacyNavigationItem = {
    title: string;
    handle?: string;
    children: Array<{ title: string; handle: string; description?: string }>;
};

export type LegacyHeaderData = { slices?: unknown[] } | null;
export type LegacyMenuData = { slices?: unknown[] } | null;

export const MenuApi = async (_args: { shop: OnlineShop; locale: Locale }): Promise<LegacyMenuData> => {
    return null;
};

export async function HeaderApi(_args: { shop: OnlineShop; locale: Locale }): Promise<LegacyHeaderData> {
    return null;
}
