import { beforeAll, describe, expect, it, vi } from 'vitest';

// The shopify.ts module imports '@shopify/shopify-api/adapters/cf-worker' as a side-effect.
// We mock the entire package so tests run in Node without needing Cloudflare Worker APIs.
const mockShopifyApi = vi.fn();
vi.mock('@shopify/shopify-api', () => ({
    ApiVersion: {
        October25: '2025-10',
    },
    shopifyApi: mockShopifyApi,
}));
vi.mock('@shopify/shopify-api/adapters/cf-worker', () => ({}));

const SECRET_KEY = 'super-secret-api-secret-key';
const API_KEY = 'public-api-key';

describe('integrations/shopify/api/shopify', () => {
    beforeAll(() => {
        vi.stubEnv('SHOPIFY_API_KEY', API_KEY);
        vi.stubEnv('SHOPIFY_API_SECRET_KEY', SECRET_KEY);
    });

    it('calls shopifyApi with the expected configuration shape', async () => {
        const fakeClient = { auth: {}, utils: {} };
        mockShopifyApi.mockReturnValue(fakeClient);

        await import('./shopify');

        expect(mockShopifyApi).toHaveBeenCalledWith(
            expect.objectContaining({
                userAgentPrefix: 'nordcom',
                isEmbeddedApp: true,
                apiVersion: '2025-10',
            }),
        );
    });

    it('passes the API key from environment variable', async () => {
        await import('./shopify');

        const callArg = mockShopifyApi.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(callArg?.apiKey).toBe(API_KEY);
    });

    it('passes the secret key from environment variable (not hard-coded)', async () => {
        await import('./shopify');

        const callArg = mockShopifyApi.mock.calls[0]?.[0] as Record<string, unknown>;
        // Secret must come from env, not a hard-coded literal.
        expect(callArg?.apiSecretKey).toBe(SECRET_KEY);
    });

    it('secret key is NOT directly visible on the exported shopifyAdminApi object', async () => {
        const fakeClient = {
            auth: {},
            utils: {},
            config: {
                // shopifyApi normally hides apiSecretKey, but we verify our wrapper doesn't leak it
                apiKey: API_KEY,
            },
        };
        mockShopifyApi.mockReturnValue(fakeClient);

        const { shopifyAdminApi } = await import('./shopify');

        // Walk the top-level values of the returned object looking for the raw secret string.
        const allValues = Object.values(shopifyAdminApi as unknown as Record<string, unknown>);
        const secretFound = allValues.some((v) => v === SECRET_KEY);
        expect(secretFound).toBe(false);
    });

    it('includes the required Shopify OAuth scopes', async () => {
        await import('./shopify');

        const callArg = mockShopifyApi.mock.calls[0]?.[0] as { scopes?: string[] };
        expect(callArg?.scopes).toEqual(
            expect.arrayContaining(['read_products', 'read_orders', 'write_orders', 'read_all_orders']),
        );
    });

    it('uses the configured ADMIN_DOMAIN as the Shopify host', async () => {
        vi.stubEnv('ADMIN_DOMAIN', 'admin.example.com');
        vi.resetModules();

        const mockShopifyApiConfigured = vi.fn().mockReturnValue({});
        vi.doMock('@shopify/shopify-api', () => ({
            ApiVersion: { October25: '2025-10' },
            shopifyApi: mockShopifyApiConfigured,
        }));
        vi.doMock('@shopify/shopify-api/adapters/cf-worker', () => ({}));

        await import('./shopify');

        const callArg = mockShopifyApiConfigured.mock.calls[0]?.[0] as { hostName?: string };
        expect(callArg?.hostName).toBe('admin.example.com');
    });

    it('falls back to localhost:3000 when ADMIN_DOMAIN is not set', async () => {
        vi.stubEnv('ADMIN_DOMAIN', '');
        vi.resetModules();

        const mockShopifyApiFallback = vi.fn().mockReturnValue({});
        vi.doMock('@shopify/shopify-api', () => ({
            ApiVersion: { October25: '2025-10' },
            shopifyApi: mockShopifyApiFallback,
        }));
        vi.doMock('@shopify/shopify-api/adapters/cf-worker', () => ({}));

        await import('./shopify');

        const callArg = mockShopifyApiFallback.mock.calls[0]?.[0] as { hostName?: string };
        expect(callArg?.hostName).toBe('localhost:3000');
    });

    describe('when Shopify environment variables are missing', () => {
        const importFreshShopify = async () => {
            vi.resetModules();
            const skippedShopifyApi = vi.fn();
            vi.doMock('@shopify/shopify-api', () => ({
                ApiVersion: { October25: '2025-10' },
                shopifyApi: skippedShopifyApi,
            }));
            vi.doMock('@shopify/shopify-api/adapters/cf-worker', () => ({}));
            const mod = await import('./shopify');
            return { mod, skippedShopifyApi };
        };

        it('exports a null client and is not configured when SHOPIFY_API_KEY is empty', async () => {
            vi.stubEnv('SHOPIFY_API_KEY', '');
            vi.stubEnv('SHOPIFY_API_SECRET_KEY', SECRET_KEY);

            const { mod, skippedShopifyApi } = await importFreshShopify();

            expect(mod.shopifyAdminApi).toBeNull();
            expect(mod.isShopifyConfigured).toBe(false);
            expect(skippedShopifyApi).not.toHaveBeenCalled();
        });

        it('exports a null client and is not configured when SHOPIFY_API_SECRET_KEY is empty', async () => {
            vi.stubEnv('SHOPIFY_API_KEY', API_KEY);
            vi.stubEnv('SHOPIFY_API_SECRET_KEY', '');

            const { mod, skippedShopifyApi } = await importFreshShopify();

            expect(mod.shopifyAdminApi).toBeNull();
            expect(mod.isShopifyConfigured).toBe(false);
            expect(skippedShopifyApi).not.toHaveBeenCalled();
        });

        it('exports a null client and is not configured when both keys are empty', async () => {
            vi.stubEnv('SHOPIFY_API_KEY', '');
            vi.stubEnv('SHOPIFY_API_SECRET_KEY', '');

            const { mod, skippedShopifyApi } = await importFreshShopify();

            expect(mod.shopifyAdminApi).toBeNull();
            expect(mod.isShopifyConfigured).toBe(false);
            expect(skippedShopifyApi).not.toHaveBeenCalled();
        });
    });
});

// Cannot unit-test: route.ts (OAuth callback) requires live Shopify OAuth flow.
// The route calls shopifyAdminApi.auth.begin() which initiates an OAuth redirect to Shopify's
// servers. Testing this meaningfully requires integration-level mocking of the OAuth protocol.
// Covered by: e2e or integration tests only.
