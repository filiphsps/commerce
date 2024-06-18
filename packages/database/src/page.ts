import { UnknownShopDomainError } from '@nordcom/commerce-errors';

import prisma from './prisma';

import type { Shop } from './shop';

export const PagesApi = async (shop: Shop, cache?: any) => {
    if (!(shop as any)) throw new UnknownShopDomainError();

    const callback = async () => {
        const pages = await prisma.page.findMany({
            where: {
                shopId: shop.id
            },
            select: {
                id: true,
                title: true,
                handle: true,
                content: true
            },
            cacheStrategy: {
                ttl: 60 * 60 * 4 // 4 hours.
            }
        });

        return pages;
    };

    // Fast-path for no cache.
    if (!cache || typeof cache !== 'function') return callback();

    const tags = ['shops', shop.id, 'pages', 'page']; // TODO: Utility function.
    return cache(async () => callback(), tags, {
        tags,
        revalidate: 60 * 60 * 8 // 8 hours.
    })() as ReturnType<typeof callback>;
};
