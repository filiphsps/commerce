import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

export type GetPagesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    draft?: boolean;
    __payload?: Payload;
};

const emptyResult = { docs: [], totalDocs: 0, hasNextPage: false, hasPrevPage: false, page: 1 };

export const getPages = async ({ shop, locale, limit = 100, page = 1, draft = false, __payload }: GetPagesArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return emptyResult as never as Awaited<ReturnType<Payload['find']>>;

    return payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenantId } } as never,
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        // depth: 0 — sitemap only needs slug + updatedAt; relations are wasted IO here.
        depth: 0,
        limit,
        page,
        draft,
    });
};
