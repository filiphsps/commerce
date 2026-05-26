import { skipCSRFCheck } from '@auth/core';
import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it, vi } from 'vitest';

import { mockShop } from '@/utils/test/fixtures/shop';
// Dev-mode binding: this module is first loaded with `NODE_ENV !== 'production'`; the prod test below uses `vi.resetModules()` to obtain a separate prod-mode binding without affecting this one.
import getAuthConfig from './auth.config';

const shopifyAuth = {
    shopId: '99887766',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
} as const;

const shop = { domain: 'shop.example.com' } as unknown as OnlineShop;

describe('auth/auth.config', () => {
    it('returns a config with exactly one provider (Shopify)', () => {
        const config = getAuthConfig({ shop, shopifyAuth });

        expect(Array.isArray(config.providers)).toBe(true);
        expect(config.providers).toHaveLength(1);

        const provider = config.providers[0] as { id?: string; name?: string };
        expect(provider.id).toBe('shopify');
        expect(provider.name).toBe('Shopify');
    });

    it('does not unconditionally bypass CSRF (uses the @auth/core symbol)', () => {
        const config = getAuthConfig({ shop, shopifyAuth });

        // The config must NEVER set this to literal `true` — that would
        // bypass CSRF for every request rather than for the controlled
        // Shopify OAuth callback that the upstream symbol allows.
        expect(config.skipCSRFCheck).not.toBe(true);
        expect(typeof config.skipCSRFCheck).toBe('symbol');
        expect(config.skipCSRFCheck).toBe(skipCSRFCheck);
    });

    it('declares a session cookie scoped for dev (no __Secure- prefix, no domain, not secure)', () => {
        const config = getAuthConfig({ shop, shopifyAuth });
        const sessionToken = config.cookies?.sessionToken;

        expect(sessionToken).toBeDefined();
        expect(sessionToken?.name).toBe('NordcomCommerceSession');

        const options = sessionToken?.options;
        expect(options?.httpOnly).toBe(true);
        expect(options?.sameSite).toBe('lax');
        expect(options?.path).toBe('/');
        // Intentional: localhost requires the cookie domain to be omitted entirely.
        expect(options?.domain).toBeUndefined();
        expect(options?.secure).toBe(false);
    });

    it('uses __Secure- prefix, secure:true, and dotted parent domain in production', async () => {
        vi.resetModules();
        const original = process.env.NODE_ENV;
        // `NODE_ENV` is a readonly typed property on `process.env` under
        // @types/node — assign through an `any` cast rather than `as any`
        // on the right-hand side so the literal value is still string-checked.
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

        try {
            const { default: getProdAuthConfig } = await import('./auth.config');
            const prodShop = { domain: 'sub.shop.example.com' } as unknown as OnlineShop;
            const config = getProdAuthConfig({ shop: prodShop, shopifyAuth });
            const sessionToken = config.cookies?.sessionToken;

            expect(sessionToken?.name).toBe('__Secure-NordcomCommerceSession');
            expect(sessionToken?.options?.secure).toBe(true);
            // Domain is scoped to the registrable parent (last two labels), prefixed with a dot.
            expect(sessionToken?.options?.domain).toBe('.example.com');
        } finally {
            (process.env as Record<string, string | undefined>).NODE_ENV = original;
            vi.resetModules();
        }
    });

    it('falls back from NEXTAUTH_SECRET to AUTH_SECRET for the session secret', () => {
        const originalNextAuth = process.env.NEXTAUTH_SECRET;
        const originalAuth = process.env.AUTH_SECRET;

        try {
            process.env.NEXTAUTH_SECRET = 'from-nextauth-secret';
            process.env.AUTH_SECRET = 'from-auth-secret';
            expect(getAuthConfig({ shop, shopifyAuth }).secret).toBe('from-nextauth-secret');

            // `delete` is what actually unsets the var so the `??` falls through.
            delete process.env.NEXTAUTH_SECRET;
            process.env.AUTH_SECRET = 'from-auth-secret-only';
            expect(getAuthConfig({ shop, shopifyAuth }).secret).toBe('from-auth-secret-only');
        } finally {
            if (originalNextAuth === undefined) {
                delete process.env.NEXTAUTH_SECRET;
            } else {
                process.env.NEXTAUTH_SECRET = originalNextAuth;
            }
            if (originalAuth === undefined) {
                delete process.env.AUTH_SECRET;
            } else {
                process.env.AUTH_SECRET = originalAuth;
            }
        }
    });

    it('keeps debug logging off so secrets never leak to logs', () => {
        const config = getAuthConfig({ shop, shopifyAuth });
        expect(config.debug).toBe(false);
    });

    it('persists Shopify access_token onto the JWT (jwt callback)', async () => {
        const config = getAuthConfig({ shop, shopifyAuth });
        const jwt = config.callbacks?.jwt;
        expect(typeof jwt).toBe('function');

        const baseParams = {
            user: undefined,
            profile: undefined,
            trigger: undefined,
            isNewUser: undefined,
            session: undefined,
        } as unknown as Parameters<NonNullable<typeof jwt>>[0];

        const populated = await jwt!({
            ...baseParams,
            token: {},
            account: {
                provider: 'shopify',
                providerAccountId: 'acct-1',
                type: 'oidc',
                access_token: 'shopify-access-token-123',
            },
        } as Parameters<NonNullable<typeof jwt>>[0]);
        expect(populated).toMatchObject({ shopifyAccessToken: 'shopify-access-token-123' });

        const otherProvider = await jwt!({
            ...baseParams,
            token: { shopifyAccessToken: 'untouched' },
            account: {
                provider: 'google',
                providerAccountId: 'acct-2',
                type: 'oauth',
                access_token: 'google-access-token',
            },
        } as Parameters<NonNullable<typeof jwt>>[0]);
        expect(otherProvider).toMatchObject({ shopifyAccessToken: 'untouched' });

        const noAccount = await jwt!({
            ...baseParams,
            token: { shopifyAccessToken: 'kept' },
            account: null,
        } as Parameters<NonNullable<typeof jwt>>[0]);
        expect(noAccount).toMatchObject({ shopifyAccessToken: 'kept' });
    });

    it('exposes the Shopify access token on session.user (session callback)', async () => {
        const config = getAuthConfig({ shop, shopifyAuth });
        const sessionCb = config.callbacks?.session;
        expect(typeof sessionCb).toBe('function');

        const baseSession = {
            user: { name: 'Customer', email: 'c@example.com', image: null },
            expires: new Date(Date.now() + 60_000).toISOString(),
        };

        const withToken = await sessionCb!({
            session: { ...baseSession, user: { ...baseSession.user } },
            token: { shopifyAccessToken: 'shopify-access-token-123' },
        } as unknown as Parameters<NonNullable<typeof sessionCb>>[0]);
        expect(withToken.user).toMatchObject({ shopifyAccessToken: 'shopify-access-token-123' });

        const withoutToken = await sessionCb!({
            session: { ...baseSession, user: { ...baseSession.user } },
            token: {},
        } as unknown as Parameters<NonNullable<typeof sessionCb>>[0]);
        expect(withoutToken.user?.shopifyAccessToken).toBeUndefined();
    });

    it('works with the full mockShop fixture (smoke test)', () => {
        const config = getAuthConfig({ shop: mockShop(), shopifyAuth });
        expect(config.providers).toHaveLength(1);
        expect(config.cookies?.sessionToken?.name).toBe('NordcomCommerceSession');
    });
});
