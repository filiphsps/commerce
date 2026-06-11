import { MissingEnvironmentVariableError, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { FunctionReference } from 'convex/server';
import { describe, expect, it, vi } from 'vitest';

import {
    type GlobalSetupDeps,
    seedE2eOperator,
    shopByDomainRef,
    upsertShopRef,
    userByEmailRef,
    userCreateRef,
} from './global-setup';

const LEGACY_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';

/**
 * Builds a fully-mocked transport surface for {@link seedE2eOperator}, dispatching on the exported
 * function references so the suite can prove the seed → resolve → upsert sequence without a Convex
 * deployment.
 *
 * @param opts - `shop: null` makes the byDomain resolve miss; `existingUserId` makes the operator
 *   probe hit (re-run path).
 * @returns The deps plus their spies.
 */
function mockDeps(opts: { shop?: { _id: string; legacyId: string } | null; existingUserId?: string } = {}) {
    const shop = opts.shop === null ? null : (opts.shop ?? { _id: 'shops|demo', legacyId: LEGACY_ID });
    const query = vi.fn(async (reference: FunctionReference<'query'>) => {
        if (reference === shopByDomainRef) {
            return shop ? { shop } : null;
        }
        if (reference === userByEmailRef) {
            return opts.existingUserId ? { _id: opts.existingUserId } : null;
        }
        throw new TypeError('unexpected query reference');
    });
    const mutation = vi.fn(async (reference: FunctionReference<'mutation'>) => {
        if (reference === userCreateRef) {
            return { _id: 'users|created' };
        }
        if (reference === upsertShopRef) {
            return { shop: { _id: 'shops|demo' } };
        }
        throw new TypeError('unexpected mutation reference');
    });
    const seed = vi.fn(async () => 'shops|demo');
    const deps: GlobalSetupDeps = {
        convex: { seed, createClient: () => ({ query, mutation }) },
    };
    return { deps, seed, query, mutation };
}

/** A minimal, fully-configured environment for the seed core under test. */
function baseEnv(): NodeJS.ProcessEnv {
    return {
        CONVEX_URL: 'https://e2e.convex.cloud',
        CONVEX_SERVER_SECRET: 'server-secret',
    } as NodeJS.ProcessEnv;
}

describe('seedE2eOperator', () => {
    it('seeds, resolves the tenant, creates the operator, then syncs the collaborator join', async () => {
        const { deps, seed, query, mutation } = mockDeps();

        await expect(seedE2eOperator(baseEnv(), deps)).resolves.toBe('users|created');

        expect(seed).toHaveBeenCalledWith('https://e2e.convex.cloud');
        expect(query).toHaveBeenCalledWith(shopByDomainRef, {
            serverSecret: 'server-secret',
            domain: 'nordcom-demo-shop.com',
        });
        expect(query).toHaveBeenCalledWith(userByEmailRef, {
            serverSecret: 'server-secret',
            email: 'e2e-test@example.com',
        });
        expect(mutation).toHaveBeenCalledWith(userCreateRef, {
            serverSecret: 'server-secret',
            email: 'e2e-test@example.com',
            name: 'E2E Test User',
            emailVerified: null,
            identities: [],
        });
        expect(mutation).toHaveBeenCalledWith(upsertShopRef, {
            serverSecret: 'server-secret',
            legacyId: LEGACY_ID,
            shop: {},
            collaborators: [{ user: 'users|created', permissions: ['admin'] }],
        });
        const order = [
            seed.mock.invocationCallOrder[0],
            query.mock.invocationCallOrder[0],
            mutation.mock.invocationCallOrder[0],
        ];
        for (const [index, value] of order.entries()) {
            expect(value).toBeDefined();
            if (index > 0) {
                expect(value ?? 0).toBeGreaterThan(order[index - 1] ?? Number.POSITIVE_INFINITY);
            }
        }
    });

    it('reuses an existing operator on re-run instead of inserting a duplicate (idempotent)', async () => {
        const { deps, mutation } = mockDeps({ existingUserId: 'users|existing' });

        await expect(seedE2eOperator(baseEnv(), deps)).resolves.toBe('users|existing');

        expect(mutation).not.toHaveBeenCalledWith(userCreateRef, expect.anything());
        expect(mutation).toHaveBeenCalledWith(upsertShopRef, {
            serverSecret: 'server-secret',
            legacyId: LEGACY_ID,
            shop: {},
            collaborators: [{ user: 'users|existing', permissions: ['admin'] }],
        });
    });

    it('forwards an E2E_SHOP_DOMAIN override into the byDomain lookup', async () => {
        const env = { ...baseEnv(), E2E_SHOP_DOMAIN: 'staging.example.com' };
        const { deps, query } = mockDeps();

        await seedE2eOperator(env, deps);

        expect(query).toHaveBeenCalledWith(shopByDomainRef, {
            serverSecret: 'server-secret',
            domain: 'staging.example.com',
        });
    });

    it.each([
        'CONVEX_URL',
        'CONVEX_SERVER_SECRET',
    ] as const)('rejects without seeding when %s is unset', async (variable) => {
        const env = baseEnv();
        delete env[variable];
        const { deps, seed } = mockDeps();

        await expect(seedE2eOperator(env, deps)).rejects.toBeInstanceOf(MissingEnvironmentVariableError);
        expect(seed).not.toHaveBeenCalled();
    });

    it('rejects (writing nothing) when the demo shop cannot be resolved after the seed', async () => {
        const { deps, mutation } = mockDeps({ shop: null });

        await expect(seedE2eOperator(baseEnv(), deps)).rejects.toBeInstanceOf(UnknownShopDomainError);
        expect(mutation).not.toHaveBeenCalled();
    });
});
