import 'server-only';
import type { Payload } from 'payload';
import type { GetPageArgs, LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetArticleArgs = Omit<GetPageArgs, 'slug'> & { slug: string };

export const getArticle = async ({
    shop,
    locale,
    slug,
    draft = false,
    __payload,
}: GetArticleArgs & { __payload?: Payload }) => {
    const payload = __payload ?? (await getPayloadInstance());
    const { docs } = await payload.find({
        collection: 'articles',
        where: { and: [{ tenant: { equals: shop.id } }, { slug: { equals: slug } }] },
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};

export type { LocaleRef, ShopRef };
