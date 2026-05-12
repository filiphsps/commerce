import 'server-only';

import { Shop } from '@nordcom/commerce-db';

import { PagesApi } from '@/api/page';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type CustomPageParams = Promise<{ domain: string; locale: string; slug: string[] }>;

export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<CustomPageParams>, 'slug'>;
}): Promise<Omit<Awaited<CustomPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const pages = await PagesApi({ shop, locale });
    // Shops with no CMS pages shouldn't fail the build; Cache Components
    // requires at least one entry, so we return a sentinel that 404s.
    if (!pages) return [{ slug: [NOT_FOUND_HANDLE] }];

    let slugs: { slug: string[] }[] = [];
    switch (pages.provider) {
        case 'prismic':
            slugs = pages.items
                .filter((p): p is typeof p & { uid: string } => typeof p.uid === 'string')
                .map(({ uid }) => ({ slug: [uid] }));
            break;
        case 'shopify':
            slugs = pages.items.map(({ handle }) => ({ slug: [handle] }));
            break;
    }

    return slugs.length > 0 ? slugs : [{ slug: [NOT_FOUND_HANDLE] }];
}
