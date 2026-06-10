import { MissingEnvironmentVariableError, UnknownShopDomainError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { type GlobalSetupConvex, runGlobalSetup, shopByDomainRef } from './global-setup';

/**
 * Builds a mocked Convex surface whose seed and client resolve canned values, so the suite can
 * assert the seed → resolve → emit sequence without a deployment.
 *
 * @param shopDocId - The shop document id the mocked `byDomain` query resolves.
 * @returns The mock surface plus its spies.
 */
function mockConvex(shopDocId: string | null) {
    const seed = vi.fn(async () => shopDocId ?? 'unused');
    const query = vi.fn(async () => (shopDocId ? { shop: { _id: shopDocId } } : null));
    const convex: GlobalSetupConvex = {
        seed,
        createClient: () => ({ query }),
    };
    return { convex, seed, query };
}

/** A minimal, fully-configured environment for the setup under test. */
function baseEnv(): NodeJS.ProcessEnv {
    return {
        CONVEX_URL: 'https://e2e.convex.cloud',
        CONVEX_SERVER_SECRET: 'server-secret',
    } as NodeJS.ProcessEnv;
}

describe('runGlobalSetup', () => {
    it('seeds, then resolves the tenant via db/shops:byDomain, then emits E2E_TENANT_ID', async () => {
        const env = baseEnv();
        const { convex, seed, query } = mockConvex('shops|demo');

        await expect(runGlobalSetup(env, convex)).resolves.toBe('shops|demo');

        expect(seed).toHaveBeenCalledWith('https://e2e.convex.cloud');
        expect(query).toHaveBeenCalledWith(shopByDomainRef, {
            serverSecret: 'server-secret',
            domain: 'nordcom-demo-shop.com',
        });
        const seedOrder = seed.mock.invocationCallOrder[0];
        const queryOrder = query.mock.invocationCallOrder[0];
        expect(seedOrder).toBeDefined();
        expect(queryOrder).toBeDefined();
        expect(seedOrder ?? Number.POSITIVE_INFINITY).toBeLessThan(queryOrder ?? 0);
        expect(env.E2E_TENANT_ID).toBe('shops|demo');
    });

    it('forwards an E2E_SHOP_DOMAIN override into the byDomain lookup', async () => {
        const env = { ...baseEnv(), E2E_SHOP_DOMAIN: 'staging.example.com' };
        const { convex, query } = mockConvex('shops|staging');

        await runGlobalSetup(env, convex);

        expect(query).toHaveBeenCalledWith(shopByDomainRef, {
            serverSecret: 'server-secret',
            domain: 'staging.example.com',
        });
    });

    it('rejects without seeding when CONVEX_URL is unset', async () => {
        const env = baseEnv();
        delete env.CONVEX_URL;
        const { convex, seed } = mockConvex('shops|demo');

        await expect(runGlobalSetup(env, convex)).rejects.toBeInstanceOf(MissingEnvironmentVariableError);
        expect(seed).not.toHaveBeenCalled();
    });

    it('rejects without seeding when CONVEX_SERVER_SECRET is unset', async () => {
        const env = baseEnv();
        delete env.CONVEX_SERVER_SECRET;
        const { convex, seed } = mockConvex('shops|demo');

        await expect(runGlobalSetup(env, convex)).rejects.toBeInstanceOf(MissingEnvironmentVariableError);
        expect(seed).not.toHaveBeenCalled();
    });

    it('rejects (and emits nothing) when the demo shop cannot be resolved after the seed', async () => {
        const env = baseEnv();
        const { convex } = mockConvex(null);

        await expect(runGlobalSetup(env, convex)).rejects.toBeInstanceOf(UnknownShopDomainError);
        expect(env.E2E_TENANT_ID).toBeUndefined();
    });
});
