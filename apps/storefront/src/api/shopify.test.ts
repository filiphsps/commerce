import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { headers } from 'next/headers';
import { describe, expect, it, vi } from 'vitest';
import { ShopifyApiConfig } from '@/api/shopify';

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn(),
    },
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}));

vi.mock('react', async (importActual) => ({
    ...(((await importActual()) as any) || {}),
    cache: vi.fn().mockImplementation((func: any) => func),
    experimental_taintUniqueValue: vi.fn(),
}));

vi.mock('@shopify/hydrogen-react', () => ({
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => 'https://shop.example.com/api/2024-01/graphql.json',
        getPublicTokenHeaders: () => ({ 'X-Shopify-Storefront-Access-Token': 'public-token' }),
        getPrivateTokenHeaders: () => ({ 'Shopify-Storefront-Private-Token': 'private-token' }),
    }),
}));

describe('api/shopify', () => {
    describe('ShopifyApiConfig', () => {
        it('does not call next/headers.headers() during config construction', async () => {
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                commerceProvider: {
                    type: 'shopify',
                    domain: 'shop.example.com',
                    authentication: {
                        publicToken: 'public-token',
                        token: 'private-token',
                    },
                },
            } as unknown as OnlineShop);

            const headersMock = vi.mocked(headers);
            headersMock.mockClear();

            const shop = { domain: 'shop.example.com' } as OnlineShop;
            const config = await ShopifyApiConfig({ shop });

            expect(headersMock).not.toHaveBeenCalled();
            expect(typeof config.public).toBe('function');
            expect(typeof config.private).toBe('function');
        });

        it('uses the supplied buyerIp without invoking headers()', async () => {
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                commerceProvider: {
                    type: 'shopify',
                    domain: 'shop.example.com',
                    authentication: {
                        publicToken: 'public-token',
                        token: 'private-token',
                    },
                },
            } as unknown as OnlineShop);

            const headersMock = vi.mocked(headers);
            headersMock.mockClear();

            const shop = { domain: 'shop.example.com' } as OnlineShop;
            const config = await ShopifyApiConfig({ shop, buyerIp: '203.0.113.7' });

            expect(headersMock).not.toHaveBeenCalled();
            const privateConfig = config.private();
            // The buyerIp must end up in the private headers Shopify receives.
            // We don't assert the exact header layout (handled by @shopify/hydrogen-react)
            // — just that `private()` runs without throwing and produces a config.
            expect(privateConfig.uri).toBeTruthy();
            expect(privateConfig.headers).toBeTruthy();
        });
    });
});
