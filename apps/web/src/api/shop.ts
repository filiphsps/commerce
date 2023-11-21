import 'server-only';

import { BuildConfig } from '@/utils/build-config';
import { UnknownShopDomainError } from '@/utils/errors';

export type ShopifyCommerceProvider = {
    type: 'shopify';
    domain: string;
    storefrontId: string;
    authentication: {
        token: string;
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
                    domain: BuildConfig.shopify.domain!,
                    storefrontId: BuildConfig.shopify.storefront_id!,
                    authentication: {
                        token: BuildConfig.shopify.private_token!,
                        publicToken: BuildConfig.shopify.token
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
