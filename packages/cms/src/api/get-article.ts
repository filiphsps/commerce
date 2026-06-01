import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { GetPageArgs, LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getArticle}.
 *
 * @example
 *   const args: GetArticleArgs = { shop, locale, slug: 'my-article' };
 */
export type GetArticleArgs = Omit<GetPageArgs, 'slug'> & { slug: string };

/**
 * Fetch a single article by slug for the given shop and locale. Returns `null`
 * when no article with that slug exists for this shop.
 *
 * @param args - Shop, locale, slug, optional `draft` flag, and an optional
 *   `__payload` instance for testing without booting a second singleton.
 * @returns The article document at depth 2, or `null` when not found.
 *
 * @example
 *   const article = await getArticle({ shop, locale, slug: 'hello-world' });
 */
export const getArticle = async ({
    shop,
    locale,
    slug,
    draft = false,
    __payload,
}: GetArticleArgs & { __payload?: Payload }) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return null;

    const { docs } = await payload.find({
        collection: 'articles',
        where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: slug } }] },
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};

export type { LocaleRef, ShopRef };
