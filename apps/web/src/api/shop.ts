import 'server-only';

import { UnknownCommerceProviderError, UnknownShopDomainError } from '@/utils/errors';
import type { Locale } from '@/utils/locale';

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
export type DummyCommerceProvider = {
    type: 'dummy';
    domain: 'mock.shop';
};
export type CommerceProvider = ShopifyCommerceProvider | DummyCommerceProvider;

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
                content: {
                    type: 'prismic' as const,
                    id: !!process.env.PRISMIC_REPO
                        ? process.env.PRISMIC_REPO.split('://')[1].split('.')[0]!
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
        },
        {
            id: 'nordcom-commerce-demo',
            name: 'Nordcom Commerce Demo',
            domains: {
                primary: 'demo.nordcom.io',
                alternatives: ['staging.demo.nordcom.io']
            },
            configuration: {
                commerce: {
                    type: 'dummy' as const,
                    domain: 'mock.shop' as const
                },
                icons: {
                    favicon: {
                        src: 'https://nordcom.io/favicon.png',
                        alt: 'Nordcom Commerce',
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
                                accent: '#ed1e79',
                                background: '#000000',
                                foreground: '#fefefe'
                            },
                            {
                                type: 'secondary',
                                variant: 'default',
                                accent: '#ed1e79',
                                background: '#000000',
                                foreground: '#fefefe'
                            }
                        ],
                        logos: {
                            primary: {
                                src: 'https://nordcom.io/logo-light.svg',
                                alt: 'Nordcom Commerce',
                                width: 500,
                                height: 250
                            },
                            alternatives: {
                                square: {
                                    src: 'https://nordcom.io/favicon.png',
                                    alt: 'Nordcom Commerce',
                                    width: 500,
                                    height: 250
                                }
                            }
                        }
                    }
                },
                content: {
                    type: 'dummy' as const
                },
                thirdParty: {
                    googleTagManager: 'GTM-N6TLG8MX'
                }
            }
        }
    ];
};

export type ShopResponse = {} & Shop;
export const ShopApi = async ({ domain }: { domain: string; locale?: Locale }): Promise<ShopResponse> => {
    // TODO: This should be a cache-able database query.
    const shops = await ShopsApi();
    const shop =
        shops.find((shop) => shop.domains.primary === domain) ||
        shops.find((shop) => shop.domains.alternatives.includes(domain));

    if (!shop) {
        if (domain.endsWith('.vercel.app')) {
            // TODO: Figure out what we should do here.
            return await ShopApi({ domain: 'www.sweetsideofsweden.com' });
        }

        throw new UnknownShopDomainError();
    }

    return {
        ...shop
    };
};

export const CommerceProviderAuthenticationApi = async ({
    shop
}: {
    shop: Shop;
}): Promise<ShopifyCommerceProvider['authentication']> => {
    let res;

    switch (shop.configuration.commerce.type) {
        case 'dummy': {
            res = {
                token: '!!!-FAKE-PRIVATE-TOKEN-!!!-DO-NOT-INCLUDE-IN-CLIENT-BUNDLE-!!!',
                publicToken: 'public-auth-token',

                customers: null
            };
            break;
        }
        case 'shopify': {
            switch (shop.id) {
                case 'sweet-side-of-sweden': {
                    res = {
                        ...shop.configuration.commerce.authentication,
                        token: process.env.SHOPIFY_PRIVATE_TOKEN || null,

                        customers: {
                            id: '76188483889',
                            clientId: 'shp_9e8fb873-df9e-4a46-9842-293df6d2f2a4',
                            clientSecret: 'f2a0e4d3cd8c4457d4eda94b1bf2442209d973246a380a5dac1557f54a059753'
                        }
                    };
                    break;
                }
                default: {
                    throw new UnknownShopDomainError();
                }
            }
            break;
        }
        default: {
            throw new UnknownCommerceProviderError();
        }
    }

    // TODO: Use the React taint API.
    //taintObjectReference('', res);
    return res;
};
