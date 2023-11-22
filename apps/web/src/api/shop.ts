import 'server-only';

import { UnknownShopDomainError } from '@/utils/errors';
import { env } from 'process';

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
};
export type CommerceProvider = ShopifyCommerceProvider | DummyCommerceProvider;

export type Shop = {
    id: string;
    domains: {
        primary: string;
        alternate: string[];
    };
    configuration: {
        commerce: CommerceProvider;
    };
};

export const prepareShopForClient = (shop: Shop): Shop => {
    // Remove sensitive data from the shop object.
    const newShop = { ...shop };

    if (newShop.configuration.commerce.type === 'shopify') {
        newShop.configuration.commerce.authentication.token = null;
    }

    return newShop;
};

export const ShopsApi = async (): Promise<Shop[]> => {
    // TODO: Don't hardcode this.
    return [
        {
            id: 'sweet-side-of-sweden',
            domains: {
                primary: 'www.sweetsideofsweden.com',
                alternate: ['sweetsideofsweden.com', 'staging.sweetsideofsweden.com']
            },
            configuration: {
                commerce: {
                    type: 'shopify' as const,
                    id: process.env.SHOPIFY_SHOP_ID || '76188483889',
                    domain: process.env.SHOPIFY_CHECKOUT_DOMAIN || 'checkout.sweetsideofsweden.com',
                    storefrontId: env.SHOPIFY_STOREFRONT_ID || '2130225',
                    authentication: {
                        token: env.SHOPIFY_PRIVATE_TOKEN || null,
                        publicToken: env.SHOPIFY_TOKEN!
                    }
                }
            }
        },
        {
            id: 'nordcom-commerce-demo',
            domains: {
                primary: 'demo.nordcom.io',
                alternate: ['staging.demo.nordcom.io']
            },
            configuration: {
                commerce: {
                    type: 'dummy' as const
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
        shops.find((shop) => shop.domains.alternate.includes(domain));

    if (!shop) {
        if (domain.endsWith('.vercel.app')) {
            // TODO: Figure out what we should do here.
            return await ShopApi({ domain: 'www.sweetsideofsweden.com' });
        }

        throw new UnknownShopDomainError();
    }

    return shop;
};
