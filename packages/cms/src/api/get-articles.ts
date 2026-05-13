import 'server-only';
import type { Payload } from 'payload';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetArticlesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    tag?: string;
    draft?: boolean;
    __payload?: Payload;
};

export const getArticles = async ({
    shop,
    locale,
    limit = 12,
    page = 1,
    tag,
    draft = false,
    __payload,
}: GetArticlesArgs) => {
    const payload = __payload ?? (await getPayloadInstance());
    const where = (tag
        ? { and: [{ tenant: { equals: shop.id } }, { tags: { contains: tag } }] }
        : { tenant: { equals: shop.id } }) as never;
    return payload.find({
        collection: 'articles',
        where,
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 1,
        limit,
        page,
        sort: '-publishedAt',
        draft,
    });
};
