import 'server-only';

import { UnknownCommerceProviderError, UnknownShopDomainError } from '@/utils/errors';

export type ShopifyCommerceProvider = {
    type: 'shopify';
    id: string;
    domain: string;
    storefrontId: string;
    authentication: {
        token: string | null;
        publicToken: string;
    };
};
export type DummyCommerceProvider = {
    type: 'dummy';
    domain: 'mock.shop';
};
export type CommerceProvider = ShopifyCommerceProvider | DummyCommerceProvider;

type Color = `#${string}` | string;

type BrandColorType = 'primary' | 'secondary' | 'background';
type BrandColorVariant = 'default' | 'light' | 'dark';
type BrandColor = {
    type: BrandColorType;
    variant: BrandColorVariant;
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
    domains: {
        primary: string;
        alternatives: string[];
    };
    configuration: {
        commerce: CommerceProvider;
        design?: {
            branding?: {
                icons?: {
                    favicon?: Icon
                };
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
        };
    };
};

export const ShopsApi = async (): Promise<Shop[]> => {
    // TODO: Don't hardcode this.
    return [
        {
            id: 'sweet-side-of-sweden',
            domains: {
                primary: 'www.sweetsideofsweden.com',
                alternatives: ['sweetsideofsweden.com', 'staging.sweetsideofsweden.com']
            },
            configuration: {
                commerce: {
                    type: 'shopify' as const,
                    id: process.env.SHOPIFY_SHOP_ID || '76188483889',
                    domain: process.env.SHOPIFY_CHECKOUT_DOMAIN || 'checkout.sweetsideofsweden.com',
                    storefrontId: process.env.SHOPIFY_STOREFRONT_ID || '2130225',
                    authentication: {
                        token: null,
                        publicToken: process.env.SHOPIFY_TOKEN!
                    }
                },
                thirdParty: {
                    googleTagManager: process.env.GTM
                }
            }
        },
        {
            id: 'nordcom-commerce-demo',
            domains: {
                primary: 'demo.nordcom.io',
                alternatives: ['staging.demo.nordcom.io']
            },
            configuration: {
                design: {
                    branding: {
                        colors: [
                            {
                                type: 'primary',
                                variant: 'default',
                                background: '#ed1e79',
                                foreground: '#fefefe'
                            },
                            {
                                type: 'background',
                                variant: 'default',
                                background: '#000000',
                                foreground: '#fefefe'
                            }
                        ],
                        icons: {
                            favicon: {
                                src: 'https://nordcom.io/favicon.png',
                                alt: 'Nordcom Commerce',
                                width: 500,
                                height: 250
                            }
                        },
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
                commerce: {
                    type: 'dummy' as const,
                    domain: 'mock.shop' as const
                },
                thirdParty: {
                    googleTagManager: 'GTM-N6TLG8MX'
                }
            }
        }
    ];
};

export const ShopApi = async ({ domain }: { domain: string }): Promise<Shop> => {
    // TODO: This should be a cachable database query.
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

    return shop;
};

export const CommerceProviderAuthenticationApi = async ({
    shop
}: {
    shop: Shop;
}): Promise<ShopifyCommerceProvider['authentication']> => {
    switch (shop.configuration.commerce.type) {
        case 'dummy': {
            return {
                token: '!!!-FAKE-PRIVATE-TOKEN-!!!-DO-NOT-INCLUDE-IN-CLIENT-BUNDLE-!!!',
                publicToken: 'public-auth-token'
            };
        }
        case 'shopify': {
            switch (shop.id) {
                case 'sweet-side-of-sweden': {
                    return {
                        ...shop.configuration.commerce.authentication,
                        token: process.env.SHOPIFY_PRIVATE_TOKEN || null
                    };
                }
                default: {
                    throw new UnknownShopDomainError();
                }
            }
        }
        default: {
            throw new UnknownCommerceProviderError();
        }
    }
};
