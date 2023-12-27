import 'server-only';

import prisma from '#/utils/prisma';
import { unstable_cache as cache, revalidateTag } from 'next/cache';

export async function getShopsForUser(userId: string) {
    return await cache(
        async () => {
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
        [`admin.user.${userId}.shops`],
        {
            revalidate: 120,
            tags: [`admin.user.${userId}.shops`]
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
                    }
                }
            });
        },
        [`admin.user.${userId}.shop.${shopId}`],
        {
            revalidate: 120,
            tags: [`admin.user.${userId}.shop.${shopId}`]
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

        await revalidateTag(`admin.user.${userId}.shop.${shopId}`);
        await revalidateTag(data.domain);
        await revalidateTag(shopId);
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

        await revalidateTag(`admin.user.${userId}.shops`);
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
        [`admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.commerce-provider`],
        {
            revalidate: 120,
            tags: [`admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.commerce-provider`]
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

        await revalidateTag(`admin.user.${userId}.shop.${shopId}`);
        await revalidateTag(shopId);
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
                    },
                    cacheStrategy: { ttl: 120, swr: 3600 }
                })
            )?.contentProvider;
        },
        [`admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.content-provider`],
        {
            revalidate: 120,
            tags: [`admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.content-provider`]
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

        await revalidateTag(`admin.user.${userId}.shop.${shopId}`);
        await revalidateTag(shopId);
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
                    },
                    cacheStrategy: { ttl: 120, swr: 3600 }
                })
            )?.checkoutProvider;
        },
        [`admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.checkout-provider`],
        {
            revalidate: 120,
            tags: [`admin.user.${userId}.shop.${shopId}`, `admin.user.${userId}.shop.${shopId}.checkout-provider`]
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

        await revalidateTag(`admin.user.${userId}.shop.${shopId}`);
        await revalidateTag(shopId);
        return response;
    } catch (error: any) {
        console.error(error);
        return {
            error: error.message
        };
    }
}
