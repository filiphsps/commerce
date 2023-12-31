import 'server-only';

import prisma from '#/utils/prisma';
import { UnknownCommerceProviderError, UnknownShopDomainError } from '@/utils/errors';
import { unstable_cache as cache } from 'next/cache';
//import { experimental_taintObjectReference as taintObjectReference } from 'react';

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
export type DummyContentProvider = {
    type: 'dummy';
};
export type ContentProvider = ShopifyContentProvider | PrismicContentProvider | DummyContentProvider;

type Color = `#${string}` | string;

type BrandColorType = 'primary' | 'secondary' | 'background';
type BrandColorVariant = 'default' | 'light' | 'dark';
type BrandColor = {
    type: BrandColorType;
    variant: BrandColorVariant;
    accent: Color;
    background: Color;
    foreground: Color;
};

type Image = {
    src: string;
    alt: string;
    width: number;
    height: number;
};
type BrandImage = Image;
type Icon = Image;

export type Shop = {
    id: string;
    name: string;
    domains: {
        primary: string;
        alternatives: string[];
    };
    configuration: {
        commerce: CommerceProvider;
        content: ContentProvider;
        icons?: {
            favicon?: Icon;
        };
        design?: {
            branding?: {
                logos?: {
                    primary?: BrandImage;
                    alternatives?: {
                        monochrome?: BrandImage;
                        square?: BrandImage;
                    };
                };
                colors?: BrandColor[];
            };
        };
        thirdParty?: {
            googleTagManager?: string;
            intercom?: {
                appId: string;
                actionColor: string;
                backgroundColor: string;
            };
        };
    };
};

export const ShopsApi = async (): Promise<Shop[]> => {
    // TODO: Don't hardcode this.
    return [
        {
            id: 'sweet-side-of-sweden',
            name: 'Sweet Side of Sweden',
            domains: {
                primary: 'www.sweetsideofsweden.com',
                alternatives: ['sweetsideofsweden.com', 'staging.sweetsideofsweden.com']
            },
            configuration: {
                commerce: {
                    type: 'shopify' as const,
                    id: process.env.SHOPIFY_SHOP_ID || '76188483889',
                    domain: 'checkout.sweetsideofsweden.com',
                    storefrontId: process.env.SHOPIFY_STOREFRONT_ID || '2130225',
                    authentication: {
                        token: null,
                        publicToken: process.env.SHOPIFY_TOKEN!,
                        customers: null
                    }
                },
                icons: {
                    favicon: {
                        src: 'https://cdn.shopify.com/s/files/1/0761/8848/3889/files/logo-square.png?v=1701401938',
                        alt: 'Sweet Side of Sweden Logo- Copyright 2023 Nordcom Group Inc.',
                        width: 512,
                        height: 512
                    }
                },
                design: {
                    branding: {
                        colors: [
                            {
                                type: 'primary',
                                variant: 'default',
                                accent: '#274690',
                                background: '#fefefe',
                                foreground: '#fefefe'
                            },
                            {
                                type: 'secondary',
                                variant: 'default',
                                accent: '#EDD382',
                                background: '#fefefe',
                                foreground: '#101418'
                            }
                        ],
                        logos: {
                            primary: {
                                src: 'https://candy-by-sweden.cdn.prismic.io/candy-by-sweden/6e41b8c9-106c-44f8-a5fc-741d9c74f2d6_sweet-side-of-sweden-logo-alt.svg',
                                alt: 'Sweet Side of Sweden Logo',
                                width: 1986,
                                height: 441
                            },
                            alternatives: {
                                square: {
                                    src: 'https://cdn.shopify.com/s/files/1/0761/8848/3889/files/logo-square.png?v=1701401938',
                                    alt: 'Sweet Side of Sweden Logo',
                                    width: 512,
                                    height: 512
                                }
                            }
                        }
                    }
                },
                content: {
                    type: 'prismic' as const,
                    id: !!process.env.PRISMIC_REPO
                        ? process.env.PRISMIC_REPO.split('://')[1]?.split('.')[0]!
                        : 'candy-by-sweden',
                    repository: process.env.prismic_repository || 'https://candy-by-sweden.cdn.prismic.io/api/v2',
                    authentication: {
                        token: null
                    }
                },
                thirdParty: {
                    googleTagManager: process.env.GTM,
                    intercom: {
                        appId: 'r02wp8mx',
                        actionColor: '#274690',
                        backgroundColor: '#274690'
                    }
                }
            }
        }
    ];
};

export type ShopResponse = {} & Shop;
export const ShopApi = async (domain: string, noCache?: boolean): Promise<ShopResponse> => {
    const callback = async (domain: string) => {
        let shop = null;
        try {
            shop = await prisma.shop.findFirst({
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
                    commerceProvider: {
                        select: {
                            type: true,
                            data: true
                        }
                    }
                },
                cacheStrategy: { ttl: 120, swr: 3600 }
            });
        } catch (e) {
            console.error(e);
        }

        const shops = await ShopsApi();
        const hardcodedShop =
            shops.find((shop) => shop.domains.primary === domain) ||
            shops.find((shop) => shop.domains.alternatives.includes(domain));

        if (!hardcodedShop && !shop) {
            if (domain.endsWith('.vercel.app')) {
                // TODO: Figure out what we should do here.
                return await ShopApi('www.sweetsideofsweden.com');
            }

            throw new UnknownShopDomainError();
        }

        const res: Shop = {
            ...((hardcodedShop || {}) as any),
            ...(shop
                ? {
                      id: shop.id,
                      name: shop.name,
                      domains: {
                          primary: shop.domain,
                          alternatives: hardcodedShop?.domains?.alternatives || []
                      },
                      configuration: {
                          ...hardcodedShop?.configuration,
                          ...(shop.commerceProvider
                              ? {
                                    commerce: {
                                        ...(() => {
                                            const data =
                                                typeof shop.commerceProvider.data === 'object'
                                                    ? shop.commerceProvider.data
                                                    : JSON.parse(shop.commerceProvider.data!.toString());
                                            return {
                                                ...data,
                                                authentication: {
                                                    publicToken: data.authentication.publicToken
                                                }
                                            };
                                        })(),
                                        type: shop.commerceProvider.type as any
                                    } as CommerceProvider
                                }
                              : {})
                      }
                  }
                : {})
        };

        return res;
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

        switch (shop.configuration.commerce.type) {
            case 'shopify': {
                const data = (
                    await prisma.shop.findFirst({
                        where: {
                            domain: shop.domains.primary
                        },
                        select: {
                            commerceProvider: {
                                select: {
                                    data: true
                                }
                            }
                        },
                        cacheStrategy: { ttl: 120, swr: 3600 }
                    })
                )?.commerceProvider?.data;
                if (!data) throw new UnknownShopDomainError();

                const { authentication } = (
                    typeof data === 'object' ? data : JSON.parse(data.toString())
                ) as ShopifyCommerceProvider;
                return authentication;
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
