import { UnknownCommerceProviderError, UnknownShopDomainError } from '@nordcom/commerce-errors';

import prisma from './prisma';

import type { CacheUtil, TaintUtil } from '.';

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

export const ShopApi = async (domain: string, cache?: any) => {
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
                            id: true,
                            type: true,
                            data: true
                        }
                    }
                },
                cacheStrategy: { ttl: 3600, swr: 3600 }
            });

            if (!res) throw new UnknownShopDomainError();
            else if (!res.commerceProvider) new UnknownCommerceProviderError();
            else if (!res.commerceProvider.data) new UnknownCommerceProviderError();

            return {
                ...res,
                theme: {
                    ...((typeof res.theme?.data === 'object'
                        ? res.theme.data
                        : JSON.parse((res.theme?.data || '{}').toString())) as Partial<ShopTheme>)
                },
                commerceProvider: {
                    ...res.commerceProvider,
                    data: (typeof res.commerceProvider?.data === 'object'
                        ? res.commerceProvider.data
                        : JSON.parse(res.commerceProvider!.data.toString())) as ShopifyCommerceProvider
                },
                contentProvider: {
                    ...res.contentProvider,
                    ...((typeof res.contentProvider?.data === 'object'
                        ? res.contentProvider.data
                        : JSON.parse(res.contentProvider!.data.toString())) as PrismicContentProvider) // FIXME: This shouldn't be hardcoded to prismic.
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

    if (!cache || typeof cache !== 'function') {
        return callback(domain);
    }

    return cache(async (domain: string) => callback(domain), [domain], {
        tags: [domain],
        revalidate: 28_800 // 8hrs.
    })(domain) as ReturnType<typeof callback>;
};

export const ShopsApi = async (cache?: any) => {
    const callback = async () => {
        const shops = await prisma.shop.findMany({
            select: {
                id: true,
                domain: true
            },
            cacheStrategy: { ttl: 3600, swr: 3600 }
        });

        return Promise.all(shops.map((shop) => ShopApi(shop.domain)));
    };

    if (!cache || typeof cache !== 'function') {
        return callback();
    }

    return cache(async () => callback(), ['shops'], {
        tags: ['shops'],
        revalidate: 28_800 // 8hrs.
    })() as ReturnType<typeof callback>;
};

export const CommerceProviderAuthenticationApi = async ({
    shop,
    cache,
    taint
}: {
    shop: Shop;
    cache?: CacheUtil;
    taint?: TaintUtil;
}) => {
    const callback = async (shop: Shop) => {
        const res = await (async (shop: Shop) => {
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
                                cacheStrategy: { ttl: 3600, swr: 3600 }
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
        })(shop);

        if (!!taint && typeof taint === 'function') {
            taint('Do not pass commerce provider authentication to the client', res);
        }
        return res;
    };

    if (!cache || typeof cache !== 'function') {
        return await callback(shop);
    }

    return cache(callback, [shop.id, 'commerce', 'authentication'], {
        tags: [shop.id, `${shop.id}.commerce.authentication`],
        revalidate: 28_800 // 8hrs.
    })(shop);
};
