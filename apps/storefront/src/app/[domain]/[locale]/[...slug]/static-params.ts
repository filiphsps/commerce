import 'server-only';

import { PagesApi, Shop } from '@/api/_loaders';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type CustomPageParams = Promise<{ domain: string; locale: string; slug: string[] }>;

/**
 * Generates the `slug` segments for all published CMS custom pages under a
 * given domain/locale pair at build time. Returns a sentinel entry when the
 * shop has no pages so Cache Components always has at least one path.
 *
 * @param params - The already-resolved `domain` and `locale` from the parent segment.
 * @returns An array of `{ slug }` arrays, one per published CMS page.
 */
export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<CustomPageParams>, 'slug'>;
}): Promise<Omit<Awaited<CustomPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        return [{ slug: [NOT_FOUND_HANDLE] }];
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const pages = await PagesApi({ shop, locale });
    // Shops with no CMS pages shouldn't fail the build; Cache Components
    // requires at least one entry, so we return a sentinel that 404s.
    if (!pages?.docs) return [{ slug: [NOT_FOUND_HANDLE] }];

    const slugs = pages.docs
        .map((p) => p.slug)
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .map((s) => ({ slug: [s] }));

    return slugs.length > 0 ? slugs : [{ slug: [NOT_FOUND_HANDLE] }];
}
