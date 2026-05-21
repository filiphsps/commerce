import 'server-only';

import { getArticle } from '@nordcom/commerce-cms/api';
import type { Article } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type ArticleApiArgs = { shop: OnlineShop; locale: Locale; slug: string };

/**
 * Reads the Payload `Article` doc matching a given slug for this tenant + locale.
 *
 * Article integration in the storefront is an **overlay**: the canonical
 * article body comes from Shopify; CMS supplements it with SEO, an alternate
 * excerpt/cover, additional tags, and a Lexical body that renders below the
 * Shopify body. Returns `null` when no CMS Article exists for the slug — the
 * Shopify path then renders unchanged.
 */
export async function ArticleApi({ shop, locale, slug }: ArticleApiArgs): Promise<Article | null> {
    return getArticle({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        slug,
    });
}
