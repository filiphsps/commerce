import 'server-only';

import type { Article } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { cmsRead } from './_cms-read';
import { isDraftModeEnabled } from './_draft';

export type ArticleApiArgs = { shop: OnlineShop; locale: Locale; slug: string };

/**
 * Reads the CMS `Article` doc matching a given slug for this tenant + locale
 * from the Convex `cms/read:articleBySlug` query (the body arrives as native
 * ProseMirror JSON).
 *
 * Article integration in the storefront is an **overlay**: the canonical
 * article body comes from Shopify; CMS supplements it with SEO, an alternate
 * excerpt/cover, additional tags, and a rich-text body that renders below the
 * Shopify body via the ProseMirror renderer. Returns `null` when no CMS
 * Article exists for the slug — the Shopify path then renders unchanged. A
 * draft-mode request (the CMS preview iframe) carries the draft flag.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @param options.slug - Article slug to look up.
 * @returns The contract-shaped CMS article document, or `null` when none exists for the slug.
 */
export async function ArticleApi({ shop, locale, slug }: ArticleApiArgs): Promise<Article | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:articleBySlug', {
        shopId: shop.id,
        slug,
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as Article | null;
}
