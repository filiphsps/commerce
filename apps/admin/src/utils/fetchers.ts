import 'server-only';

import { revalidateTag, unstable_cache as cache } from 'next/cache';

import { prisma } from '@nordcom/commerce-database';
import type { ShopBase } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';

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

export async function getShop(userId: string, shopId: string, skipCache = isDevelopment) {
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

export async function updateShop(userId: string, shopId: string, data: Partial<ShopBase>) {
    try {
        const shop = await Shop.findById(shopId);
        shop.set(data);

        await shop.save();
        await revalidateAll(userId, shopId, shop.domain);
        console.debug('Updated shop', JSON.stringify(shop.toObject(), null, 2));
        return shop;
    } catch (error: any) {
        console.error(error);
        return {
            error: error.message
        };
    }
}

export async function createShop(userId: string) {
    try {
        const response = await prisma.shop.create({
            data: {
                id: 'sweet-side-of-sweden',
                name: 'Sweet Side of Sweden',
                domain: 'www.sweetsideofsweden.com',
                alternativeDomains: ['sweetsideofsweden.com', 'staging.sweetsideofsweden.com'],
                collaborators: {
                    create: {
                        userId
                    }
                }
            }
        });

        await revalidateAll(userId, response.id, response.domain);
        return response;
    } catch (error: any) {
        console.error(error);
        return {
            error: error.message
        };
    }
}

export async function getCommerceProvider(userId: string, shopId: string) {
    return await cache(
        async () => {
            return (
                await prisma.shop.findUnique({
                    where: {
                        id: shopId,
                        collaborators: { some: { userId } }
                    },
                    select: {
                        commerceProvider: true
                    },
                    cacheStrategy: { ttl: 120, swr: 3600 }
                })
            )?.commerceProvider;
        },
        ['admin', shopId, userId, 'commerce-provider'],
        {
            revalidate: 120,
            tags: [
                'admin',
                shopId,
                `admin.user.${userId}.shop.${shopId}`,
                `admin.user.${userId}.shop.${shopId}.commerce-provider`
            ]
        }
    )();
}
export async function updateCommerceProvider(userId: string, shopId: string, data: any) {
    try {
        const response = await prisma.shop.update({
            where: {
                id: shopId,
                collaborators: { some: { userId } }
            },
            data: {
                commerceProvider: {
                    upsert: {
                        update: data,
                        create: data
                    }
                }
            }
        });

        await revalidateAll(userId, shopId, response.domain);
        return response;
    } catch (error: any) {
        console.error(error);

        return {
            error: error.message
        };
    }
}

export async function getContentProvider(userId: string, shopId: string) {
    return await cache(
        async () => {
            return (
                await prisma.shop.findUnique({
                    where: {
                        id: shopId,
                        collaborators: { some: { userId } }
                    },
                    select: {
                        contentProvider: true
                    }
                })
            )?.contentProvider;
        },
        [
            'admin',
            shopId,
            `admin.user.${userId}.shop.${shopId}`,
            `admin.user.${userId}.shop.${shopId}.content-provider`
        ],
        {
            revalidate: 120,
            tags: [
                'admin',
                shopId,
                `admin.user.${userId}.shop.${shopId}`,
                `admin.user.${userId}.shop.${shopId}.content-provider`
            ]
        }
    )();
}
export async function updateContentProvider(userId: string, shopId: string, data: any) {
    try {
        const response = await prisma.shop.update({
            where: {
                id: shopId,
                collaborators: { some: { userId } }
            },
            data: {
                contentProvider: {
                    upsert: {
                        update: data,
                        create: data
                    }
                }
            }
        });

        await revalidateAll(userId, shopId, response.domain);
        return response;
    } catch (error: any) {
        console.error(error);
        return {
            error: error.message
        };
    }
}

export async function getCheckoutProvider(userId: string, shopId: string) {
    return await cache(
        async () => {
            return (
                await prisma.shop.findUnique({
                    where: {
                        id: shopId,
                        collaborators: { some: { userId } }
                    },
                    select: {
                        checkoutProvider: true
                    }
                })
            )?.checkoutProvider;
        },
        [
            'admin',
            shopId,
            `admin.user.${userId}.shop.${shopId}`,
            `admin.user.${userId}.shop.${shopId}.checkout-provider`
        ],
        {
            revalidate: 120,
            tags: [
                'admin',
                shopId,
                `admin.user.${userId}.shop.${shopId}`,
                `admin.user.${userId}.shop.${shopId}.checkout-provider`
            ]
        }
    )();
}
export async function updateCheckoutProvider(userId: string, shopId: string, data: any) {
    try {
        const response = await prisma.shop.update({
            where: {
                id: shopId,
                collaborators: { some: { userId } }
            },
            data: {
                checkoutProvider: {
                    upsert: {
                        update: data,
                        create: data
                    }
                }
            }
        });

        await revalidateAll(userId, shopId, response.domain);
        return response;
    } catch (error: any) {
        console.error(error);

        return {
            error: error.message
        };
    }
}

export async function getShopTheme(userId: string, shopId: string) {
    return await cache(
        async () => {
            return (
                await prisma.shop.findUnique({
                    where: {
                        id: shopId,
                        collaborators: { some: { userId } }
                    },
                    select: {
                        theme: true
                    }
                })
            )?.theme;
        },
        ['admin', shopId, `admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.theme`],
        {
            revalidate: 120,
            tags: ['admin', shopId, `admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.theme`]
        }
    )();
}
export async function updateShopTheme(userId: string, shopId: string, data: any) {
    try {
        const response = await prisma.shop.update({
            where: {
                id: shopId,
                collaborators: { some: { userId } }
            },
            data: {
                theme: {
                    upsert: {
                        update: data,
                        create: data
                    }
                }
            }
        });

        await revalidateAll(userId, shopId, response.domain);
        return response;
    } catch (error: any) {
        console.error(error);

        return {
            error: error.message
        };
    }
}
