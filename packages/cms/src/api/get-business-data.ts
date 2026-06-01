import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getBusinessData}.
 *
 * @example
 *   const args: GetBusinessDataArgs = { shop, locale };
 */
export type GetBusinessDataArgs = { shop: ShopRef; locale: LocaleRef; draft?: boolean; __payload?: Payload };

/**
 * Fetch the `businessData` singleton for the given shop and locale. Returns
 * `null` when no business data exists for this shop.
 *
 * @param args - Shop, locale, optional `draft` flag, and optional `__payload`.
 * @returns The business data document at depth 1, or `null` when not found.
 *
 * @example
 *   const biz = await getBusinessData({ shop, locale });
 */
export const getBusinessData = async ({ shop, locale, draft = false, __payload }: GetBusinessDataArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return null;

    const { docs } = await payload.find({
        collection: 'businessData',
        where: { tenant: { equals: tenantId } },
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 1,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
