import 'server-only';

import { prisma } from '@nordcom/commerce-database';
import { db, Shop } from '@nordcom/commerce-db';
import { unstable_cache as cache, revalidateTag } from 'next/cache';

const revalidateAll = async (userId: string, shopId: string, domain: string) => {
    await revalidateTag('admin');
    await revalidateTag(`admin.user.${userId}`);
    await revalidateTag(domain);
    await revalidateTag(shopId);
};

export async function getShopsForUser(userId: string) {
    return await cache(
        async () => {
            // FIXME: This is just here for debugging.
            void Shop(await db())
                .find({
                    /*'collaborators.user': userId*/
                })
                .sort({ createdAt: -1 })
                .exec()
                .then((shops) => console.debug(`[mongodb-rework]: Found ${shops.map(({ name }) => name).join(', ')}!`));

            return prisma.shop.findMany({
                where: {
                    collaborators: {
                        some: { userId }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    domain: true
                },
                orderBy: [
                    {
                        createdAt: 'desc'
                    }
                ]
            });
        },
        ['admin', userId, `admin.user.${userId}.shops`],
        {
            revalidate: 120,
            tags: ['admin', userId, `admin.user.${userId}.shops`]
        }
    )();
}

export async function getShop(userId: string, shopId: string) {
    return await cache(
        async () => {
            return prisma.shop.findFirst({
                where: {
                    id: shopId,
                    collaborators: {
                        some: {
                            userId
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    collaborators: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    image: true,
                                    email: true
                                }
                            }
                        }
                    },
                    icons: {
                        select: {
                            favicon: true
                        }
                    }
                }
            });
        },
        ['admin', shopId, `admin.user.${userId}`, `admin.user.${userId}.shop.${shopId}`],
        {
            revalidate: 120,
            tags: ['admin', shopId, `admin.user.${userId}.shop.${shopId}`]
        }
    )();
}
export type UpdateShopData = {
    name: string;
    domain: string;
};
export async function updateShop(userId: string, shopId: string, data: UpdateShopData) {
    try {
        const response = await prisma.shop.update({
            where: {
                id: shopId,
                collaborators: {
                    some: {
                        userId
                    }
                }
            },
            data: data
        });

        await revalidateAll(userId, shopId, data.domain);
        return response;
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
