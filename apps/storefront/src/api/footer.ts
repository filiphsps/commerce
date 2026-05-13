import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

/**
 * Legacy Prismic-shaped footer data. The type is intentionally loose so
 * existing footer components compile during the migration. FooterApi always
 * returns null until the new CMS Footer global (getFooter) is wired in.
 */
// biome-ignore lint/suspicious/noExplicitAny: legacy Prismic shape during migration
export type LegacyFooterData = (Record<string, any> & {}) | null;

export async function FooterApi(_args: { shop: OnlineShop; locale: Locale }): Promise<LegacyFooterData> {
    return null;
}
