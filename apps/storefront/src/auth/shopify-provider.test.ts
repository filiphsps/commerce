import type { OnlineShop } from '@nordcom/commerce-db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuildConfig } from '@/utils/build-config';
import ShopifyProvider, { type ShopifyProfile } from './shopify-provider';

const baseOptions = {
    shopId: '99887766',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
} as const;

const baseShop = { domain: 'shop.example.com' } as unknown as OnlineShop;

const baseProfile: ShopifyProfile = {
    iss: 'https://customer.login.shopify.com',
    sub: 'customer-123',
    aud: 'test-client-id',
    exp: 0,
    iat: 0,
    auth_time: 0,
    device_uuid: 'device',
    sid: 'sid',
    dest: 'dest',
    email: 'buyer@example.com',
    email_verified: true,
};

describe('auth/shopify-provider', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('builds the Customer Account API URL from BuildConfig.shopify.api', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ data: { customer: { displayName: 'Ada', imageUrl: null } } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const provider = ShopifyProvider(baseOptions, baseShop);
        await provider.profile!(baseProfile, { access_token: 'access-token' });

        const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
        expect(calledUrl).toBe(
            `https://shopify.com/${baseOptions.shopId}/account/customer/api/${BuildConfig.shopify.api}/graphql`,
        );
        // Sanity: the URL must include the API version segment so a future BuildConfig bump propagates.
        expect(calledUrl).toContain(`/api/${BuildConfig.shopify.api}/graphql`);
    });

    it('does not call the Customer Account API when no access token is present', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        const provider = ShopifyProvider(baseOptions, baseShop);
        const user = await provider.profile!(baseProfile, {});

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(user).toMatchObject({ id: baseProfile.sub, email: baseProfile.email });
    });
});
