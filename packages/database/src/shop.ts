import {
    UnknownApiError,
    UnknownCommerceProviderError,
    UnknownContentProviderError,
    UnknownShopDomainError
} from '@nordcom/commerce-errors';

import prisma from './prisma';

import type { CacheUtil, Optional } from '.';
import type { JsonValue } from '@prisma/client/runtime/library';

export type ShopTheme = {
    header: {
        theme: 'primary' | 'secondary';
        themeVariant: 'default' | 'light' | 'dark';
    };
};

type ShopifyCommerceProviderAuthenticationSecrets = {
    token: string | null;
    customers: {
        id: string;
        clientId: string;
        clientSecret: string;
    } | null;
};
type ShopifyCommerceProviderAuthenticationPublic = {
    publicToken: string;
};
export type ShopifyCommerceProvider = {
    type: 'shopify';
    id: string;
    /** E.g. checkout.sweetsideofsweden.com */
    domain: string;
    storefrontId: string;
    authentication: ShopifyCommerceProviderAuthenticationPublic &
        Optional<ShopifyCommerceProviderAuthenticationSecrets>;
};
export type CommerceProvider = ShopifyCommerceProvider;

export type ShopifyContentProvider = {
    type: 'shopify';
};
export type PrismicContentProvider = {
    type: 'prismic';
    repository: string;
    repositoryName: string;

    authentication: {
        token: string | null;
    } | null;
};
export type ContentProvider = ShopifyContentProvider | PrismicContentProvider;

export type Shop = Awaited<ReturnType<typeof ShopApi>>;

const parseContentProvider = ({ type, data }: { type: string; data: JsonValue }, secure = false): ContentProvider => {
    switch (type) {
        case 'shopify': {
            const { authentication, ...provider } = typeof data === 'string' ? JSON.parse(data!.toString()) : data;
            return {
                ...(secure ? authentication : {}),
                ...provider,
                type
            } as ShopifyContentProvider;
        }
        case 'prismic': {
            const { authentication, ...provider } = (
                typeof data === 'string' ? JSON.parse(data!.toString()) : data
            ) as PrismicContentProvider;

            return {
                ...(secure ? authentication : {}),
                ...provider,
                type
            } as PrismicContentProvider;
        }
        default: {
            throw new UnknownContentProviderError();
        }
    }
};
const parseCommerceProvider = ({ type, data }: { type: string; data: JsonValue }, secure = false): CommerceProvider => {
    switch (type) {
        case 'shopify': {
            const {
                authentication: { publicToken, ...authentication },
                ...provider
            } = (typeof data === 'string' ? JSON.parse(data!.toString()) : data) as Omit<
                ShopifyCommerceProvider,
                'type'
            >;

            return {
                authentication: {
                    publicToken,
                    ...(secure ? authentication : {})
                },
                ...provider,
                type
            } as ShopifyCommerceProvider;
        }
        default: {
            throw new UnknownCommerceProviderError();
        }
    }
};

export const ShopApi = async (domain: string, cache?: CacheUtil, secure = false) => {
    if (!domain) throw new UnknownShopDomainError();

    try {
        const callback = async (domain: string, secure: boolean) => {
            try {
                const { commerceProvider, contentProvider, ...res } = await prisma.shop.findFirstOrThrow({
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
                    cacheStrategy: {
                        ttl: 60 * 60 * 4 // 4 hours.
                    }
                });

                if (commerceProvider === null || !commerceProvider.data) {
                    throw new UnknownCommerceProviderError();
                } else if (!contentProvider?.data) {
                    throw new UnknownContentProviderError();
                }

                return {
                    ...res,
                    theme: {
                        ...((typeof res.theme?.data === 'object'
                            ? res.theme.data
                            : JSON.parse((res.theme?.data || '{}').toString())) as Partial<ShopTheme>)
                    },
                    commerceProvider: parseCommerceProvider(commerceProvider!, secure),
                    contentProvider: parseContentProvider(contentProvider!, secure)
                };
            } catch {
                return {} as never; // TODO: This this ugly hack.
            }
        };

        if (!cache || typeof cache !== 'function') {
            return callback(domain, secure);
        }

        const tags = [`secure=${secure ? 'true' : 'false'}`, `cache=${!!cache ? 'true' : 'false'}`];
        return cache(callback, [domain, ...tags], {
            tags: [domain, ...tags],
            revalidate: 28800 // 8 hours.
        })(domain, secure) as ReturnType<typeof callback>;
    } catch (error: unknown) {
        throw new UnknownShopDomainError();
    }
};

export const ShopsApi = async (cache?: any) => {
    try {
        const callback = async () => {
            const shops = await prisma.shop.findMany({
                select: {
                    id: true,
                    domain: true
                },
                cacheStrategy: {
                    ttl: 60 * 60 * 4 // 4 hours.
                }
            });

            return Promise.all(shops.map((shop) => ShopApi(shop.domain)));
        };

        if (!cache || typeof cache !== 'function') {
            return callback();
        }

        return cache(async () => callback(), ['shops'], {
            tags: ['shops'],
            revalidate: 28800 // 8 hours.
        })() as ReturnType<typeof callback>;
    } catch (error: unknown) {
        throw new UnknownApiError((error as any)?.message);
    }
};
