import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Minimal shop reference required by all CMS API helpers. Callers pass their
 * full shop object; only these three fields are read.
 *
 * @example
 *   const ref: ShopRef = { id: shop.id, domain: shop.domain, i18n: { defaultLocale: 'en-US' } };
 */
export type ShopRef = { id: string; domain: string; i18n: { defaultLocale: string } };

/**
 * Locale reference passed through to Payload's `locale` + `fallbackLocale`.
 *
 * @example
 *   const ref: LocaleRef = { code: 'en-US' };
 */
export type LocaleRef = { code: string };

/**
 * Arguments accepted by {@link getPage}.
 *
 * @example
 *   const args: GetPageArgs = { shop, locale, slug: 'home' };
 */
export type GetPageArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    slug: string;
    draft?: boolean;
    /** Test seam — pass a pre-booted Payload instance. */
    __payload?: Payload;
};

/**
 * Fetch a single page by slug for the given shop and locale. Returns `null`
 * when the slug does not exist, the tenant is unsynced, or the shop id is
 * missing.
 *
 * @param args - Shop, locale, page slug, optional `draft` flag, optional `__payload`.
 * @returns The page document at depth 2, or `null` when not found.
 *
 * @example
 *   const page = await getPage({ shop, locale, slug: 'home' });
 */
export const getPage = async ({ shop, locale, slug, draft = false, __payload }: GetPageArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return null;

    const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: slug } }] },
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
