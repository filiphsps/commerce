import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';

import { revalidateTag, unstable_cache as cache } from 'next/cache';

const revalidateAll = async (userId: string, shopId: string, domain: string) => {
    revalidateTag('admin');
    revalidateTag(`admin.user.${userId}`);
    revalidateTag(domain);
    revalidateTag(shopId);
};

const isDevelopment = process.env.NODE_ENV === 'development';

export async function getShopsForUser(userId: string, skipCache = isDevelopment) {
    const action = async () => {
        return Shop.findByCollaborator({
            collaboratorId: userId,
            sort: '-createdAt'
        }).then((res) => (Array.isArray(res) ? res : [res]));
    };

    if (skipCache) return await action();
    return await cache(action, ['admin', userId, `admin.user.${userId}.shops`], {
        revalidate: 120,
        tags: ['admin', userId, `admin.user.${userId}.shops`]
    })();
}

export async function getShop(userId: string, shopId: string, skipCache = isDevelopment): Promise<any> {
    const action = async () => {
        return await (await Shop.findById(shopId)).populate('collaborators.user').then(async (shop) => {
            await shop!.save();
            return shop;
        });
    };

    if (skipCache) return await action();
    return await cache(action, ['admin', shopId, `admin.user.${userId}`, `admin.user.${userId}.shop.${shopId}`], {
        revalidate: 120,
        tags: ['admin', shopId, `admin.user.${userId}.shop.${shopId}`]
    })();
}

export async function updateShop(userId: string, shopId: string, data: Partial<OnlineShop>) {
    try {
        const sanitized = Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('$')));

        const shop = await Shop.findById(shopId);
        shop.set(sanitized);

        await shop.save();
        await revalidateAll(userId, shopId, shop.domain);
        return shop;
    } catch (error: any) {
        console.error(error);
        return {
            error: error.message
        };
    }
}

// eslint-disable-next-line unused-imports/no-unused-vars
export async function createShop(userId: string) {
    return {} as any;
}

// eslint-disable-next-line unused-imports/no-unused-vars
export async function updateCommerceProvider(domain: string, data: Partial<OnlineShop['commerceProvider']>) {
    return {} as any;
}
// eslint-disable-next-line unused-imports/no-unused-vars
export async function updateContentProvider(domain: string, data: Partial<OnlineShop['contentProvider']>) {
    return {} as any;
}

// eslint-disable-next-line unused-imports/no-unused-vars
export async function getShopTheme(userId: string, shopId: string) {
    return {} as any;
}
// eslint-disable-next-line unused-imports/no-unused-vars
export async function updateShopTheme(userId: string, shopId: string, data: any) {
    return {} as any;
}
