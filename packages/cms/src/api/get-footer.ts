import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getFooter}.
 *
 * @example
 *   const args: GetFooterArgs = { shop, locale };
 */
export type GetFooterArgs = { shop: ShopRef; locale: LocaleRef; draft?: boolean; __payload?: Payload };

/**
 * Fetch the `footer` singleton for the given shop and locale. Returns `null`
 * when the tenant is unsynced or the shop id is missing.
 *
 * @param args - Shop, locale, optional `draft` flag, and optional `__payload`.
 * @returns The footer document at depth 2, or `null` when not found.
 *
 * @example
 *   const footer = await getFooter({ shop, locale });
 */
export const getFooter = async ({ shop, locale, draft = false, __payload }: GetFooterArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return null;

    const { docs } = await payload.find({
        collection: 'footer',
        where: { tenant: { equals: tenantId } },
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
