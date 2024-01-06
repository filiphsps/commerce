import 'server-only';

import prisma from '#/utils/prisma';
import { UnknownCommerceProviderError, UnknownShopDomainError } from '@/utils/errors';
import { unstable_cache as cache } from 'next/cache';
//import { experimental_taintObjectReference as taintObjectReference } from 'react';

export type ShopTheme = {
    header: {
        theme: 'primary' | 'secondary';
        themeVariant: 'default' | 'light' | 'dark';
    };
};

export type ShopifyCommerceProvider = {
    type: 'shopify';
    id: string;
    /** E.g. checkout.sweetsideofsweden.com */
    domain: string;
    storefrontId: string;
    authentication: {
        token: string | null;
        publicToken: string;

        customers: {
            id: string;
            clientId: string;
            clientSecret: string;
        } | null;
    };
};
export type CommerceProvider = ShopifyCommerceProvider;

export type ShopifyContentProvider = {
    type: 'shopify';
};
export type PrismicContentProvider = {
    type: 'prismic';
    id: string;
    repository: string;
    authentication: {
        token: string | null;
    };
};
export type ContentProvider = ShopifyContentProvider | PrismicContentProvider;

export type Shop = Awaited<ReturnType<typeof ShopApi>>;

export const ShopsApi = async () => {
    return cache(
        async () => {
            const shops = await prisma.shop.findMany({
                select: {
                    id: true,
                    domain: true
                },
                cacheStrategy: { ttl: 120, swr: 3600 }
            });

            return Promise.all(shops.map((shop) => ShopApi(shop.domain)));
        },
        ['shops'],
        {
            tags: ['shops'],
            revalidate: 28_800 // 8hrs.
        }
    )();
};

export type ShopResponse = {} & Shop;
export const ShopApi = async (domain: string, noCache?: boolean) => {
    const callback = async (domain: string) => {
        const {
            commerceProvider: { data: commerceProviderData, ...commerceProvider },
            ...shop
        } = await (async () => {
            const res = await prisma.shop.findFirst({
                where: {
                    OR: [
                        {
                            domain: domain
                        },
                        {
                            alternativeDomains: {
                                has: domain
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    icons: {
                        select: {
                            favicon: true
                        }
                    },
                    logos: {
                        select: {
                            primary: true,
                            alternative: true
                        }
                    },
                    theme: {
                        select: {
                            data: true
                        }
                    },
                    branding: {
                        select: {
                            brandColors: true
                        }
                    },
                    thirdParty: true,
                    commerceProvider: {
                        select: {
                            type: true,
                            data: true
                        }
                    },
                    contentProvider: {
                        select: {
                            type: true
                        }
                    }
                },
                cacheStrategy: { ttl: 120, swr: 3600 }
            });

            if (!res) throw new UnknownShopDomainError();
            else if (!res.commerceProvider) new UnknownCommerceProviderError();
            else if (!res.commerceProvider.data) new UnknownCommerceProviderError();

            return {
                ...res,
                theme: {
                    ...((typeof res.theme?.data === 'object'
                        ? res.theme?.data
                        : JSON.parse(res.theme!.data.toString())) as ShopTheme)
                },
                commerceProvider: {
                    ...res.commerceProvider,
                    data: (typeof res.commerceProvider?.data === 'object'
                        ? res.commerceProvider?.data
                        : JSON.parse(res.commerceProvider!.data.toString())) as ShopifyCommerceProvider
                }
            };
        })();

        return {
            ...shop,
            commerceProvider: {
                ...commerceProvider,
                ...commerceProviderData,
                authentication: {
                    publicToken: commerceProviderData.authentication.publicToken
                }
            }
        };
    };

    if (noCache) {
        return await callback(domain);
    }

    return cache(async (domain: string) => callback(domain), [domain], {
        tags: [domain],
        revalidate: 28_800 // 8hrs.
    })(domain);
};

export const CommerceProviderAuthenticationApi = async ({ shop, noCache }: { shop: Shop; noCache?: boolean }) => {
    const callback = async (shop: Shop) => {
        // TODO: Use the React taint API.
        //taintObjectReference('', res);

        if (!shop) throw new UnknownShopDomainError();
        else if (!shop.commerceProvider) throw new UnknownCommerceProviderError();

        switch (shop.commerceProvider.type) {
            case 'shopify': {
                const { data, ...provider } =
                    (
                        await prisma.shop.findFirst({
                            where: {
                                domain: shop.domain
                            },
                            select: {
                                commerceProvider: {
                                    select: {
                                        type: true,
                                        data: true
                                    }
                                }
                            },
                            cacheStrategy: { ttl: 120, swr: 3600 }
                        })
                    )?.commerceProvider || {};
                if (!provider || !data) throw new UnknownShopDomainError();

                return {
                    ...provider,
                    ...((typeof data === 'object' ? data : JSON.parse(data.toString())) as ShopifyCommerceProvider)
                };
            }
            default: {
                throw new UnknownCommerceProviderError();
            }
        }
    };

    if (noCache) {
        return await callback(shop);
    }

    return cache(callback, [shop.id, 'commerce', 'authentication'], {
        tags: [shop.id, `${shop.id}.commerce.authentication`],
        revalidate: 28_800 // 8hrs.
    })(shop);
};
