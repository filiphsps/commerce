import 'server-only';

import { getArticle } from '@nordcom/commerce-cms/api';
import type { Article } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
import { isDraftModeEnabled } from './_draft';
import { normalizePayloadDoc } from './_normalize-payload';

export type ArticleApiArgs = { shop: OnlineShop; locale: Locale; slug: string };

/**
 * Reads the CMS `Article` doc matching a given slug for this tenant + locale.
 *
 * Article integration in the storefront is an **overlay**: the canonical
 * article body comes from Shopify; CMS supplements it with SEO, an alternate
 * excerpt/cover, additional tags, and a rich-text body that renders below the
 * Shopify body via the ProseMirror renderer. Returns `null` when no CMS
 * Article exists for the slug — the Shopify path then renders unchanged.
 * Routed through the SFREAD-12 dual-read loader; flipped BY DEFAULT since
 * CUTOVER-05 (the Convex `cms/read:articleBySlug` read is authoritative and
 * serves the body as native ProseMirror JSON; `CMS_READ_FLIP=-article` is the
 * emergency-shadow lever back to the inert Payload-on-Mongo snapshot). A
 * draft-mode request forwards the draft flag down BOTH legs and skips the
 * shadow.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.slug - Article slug to look up.
 * @returns The normalized CMS article document, or `null` when none exists for the slug.
 */
export async function ArticleApi({ shop, locale, slug }: ArticleApiArgs): Promise<Article | null> {
    const draft = await isDraftModeEnabled();
    return runCmsDualRead<Article | null>({
        getter: 'article',
        shopId: shop.id,
        locale: locale.code,
        key: slug,
        draft,
        mongo: async () => {
            const article = await getArticle({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                slug,
                draft,
            });
            return article ? normalizePayloadDoc(article, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:articleBySlug', {
                shopId: shop.id,
                slug,
                locale: locale.code,
                ...(draft ? { draft: true } : {}),
            }),
    });
}
