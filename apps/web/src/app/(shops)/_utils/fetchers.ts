import 'server-only';

import prisma from '#/utils/prisma';
import { unstable_cache as cache, revalidateTag } from 'next/cache';

export async function getShopsForUser(userId: string) {
    return await cache(
        async () => {
            return prisma.shop.findMany({
                where: {
                    collaborators: { some: { userId } }
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

export async function getShopForUser(userId: string, shopId: string) {
    return await cache(
        async () => {
            return prisma.shop.findUnique({
                where: {
                    id: shopId,
                    collaborators: { some: { userId } }
                },
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    collaborators: {
                        select: {
                            user: {
                                select: {
                                    name: true
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
