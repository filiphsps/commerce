import type { OnlineShop } from '@nordcom/commerce-db';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockShop } from '@/utils/test/fixtures/shop';

// Stub NextAuth so tests that reach the constructor don't spin up the real
// Auth.js handler (which would try to wire HTTP routes and a session secret).
// The throw-path tests never reach this mock, but having it in place keeps the
// happy-path tests fast and deterministic.
vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        handlers: { GET: vi.fn(), POST: vi.fn() },
        auth: vi.fn(async () => ({ user: null })),
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
}));

import { getAuth, getAuthSession } from './auth';

const makeValidShop = () =>
    mockShop({
        overrides: {
            commerceProvider: {
                type: 'shopify',
                domain: 'mock.myshopify.com',
                authentication: {
                    customers: {
                        id: '99887766',
                        clientId: 'test-client-id',
                        clientSecret: 'test-client-secret',
                    },
                },
            } as any,
        },
    });

describe('auth/auth', () => {
    afterEach(() => {
        // Clear call history on the next-auth mock between tests so future
        // call-count assertions don't leak across happy-path tests.
        vi.clearAllMocks();
    });

    describe('getAuth', () => {
        it('throws UnknownCommerceProviderError when the shop is not a Shopify shop', () => {
            const shop = {
                commerceProvider: { type: 'unknown' },
            } as unknown as OnlineShop;

            // ESM class identity can diverge across module instances, so check
            // name rather than instanceof to avoid false negatives in the test
            // runner (mirrors the pattern in middleware/storefront.test.ts).
            let caught: unknown;
            try {
                getAuth(shop);
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeDefined();
            expect((caught as Error).name).toBe('UnknownCommerceProviderError');
        });

        it('throws InvalidShopifyCustomerAccountsApiConfiguration when authentication.customers is missing', () => {
            const shop = {
                domain: 'shop.example.com',
                commerceProvider: {
                    type: 'shopify',
                    authentication: {},
                },
            } as unknown as OnlineShop;

            let caught: unknown;
            try {
                getAuth(shop);
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeDefined();
            expect((caught as Error).name).toBe('InvalidShopifyCustomerAccountsApiConfiguration');
        });

        it('returns a NextAuth instance with handlers/auth/signIn/signOut for a valid Shopify shop', () => {
            const shop = makeValidShop();

            const result = getAuth(shop);

            // NextAuth's standard surface — locks in that getAuth is returning
            // a configured handler rather than e.g. just the config object.
            expect(result).toBeDefined();
            expect(result.handlers).toBeDefined();
            expect(typeof result.auth).toBe('function');
            expect(typeof result.signIn).toBe('function');
            expect(typeof result.signOut).toBe('function');
        });
    });

    describe('getAuthSession', () => {
        it('returns a Promise that resolves to the result of getAuth(shop).auth()', async () => {
            const shop = makeValidShop();

            const promise = getAuthSession(shop);
            expect(promise).toBeInstanceOf(Promise);

            const session = await promise;
            // Our next-auth mock's auth() resolves to { user: null }.
            expect(session).toEqual({ user: null });
        });
    });
});
