import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { type ClerkSeedArgs, type ClerkSetupDeps, seedE2eClerkOperator } from './global-setup';

const SHOP_ID = 'shops|demo';
const ORG_ID = 'org_e2e';
const USER_ID = 'user_e2e';
const EMAIL = 'e2e-test+clerk_test@example.com';

/**
 * Builds a fully-mocked Clerk + Convex transport surface for {@link seedE2eClerkOperator}, so the suite
 * proves the provision → seed-shop → seed-operator sequence without a Clerk dev instance or a Convex
 * deployment.
 *
 * @returns The deps plus their spies.
 */
function mockDeps() {
    const ensureUser: ClerkSetupDeps['ensureUser'] = vi.fn(async () => ({ id: USER_ID, primaryEmail: EMAIL }));
    const ensureOrg: ClerkSetupDeps['ensureOrg'] = vi.fn(async () => ({ id: ORG_ID, name: 'Nordcom E2E', slug: 'nordcom-e2e' }));
    const seedShop: ClerkSetupDeps['seedShop'] = vi.fn(async () => SHOP_ID);
    // The mock echoes the org id it was handed and resolves the shop id from the canonical SHOP_ID, so
    // the assertions can prove the harness forwards the deployment URL + the resolved org through.
    const seedOperator: ClerkSetupDeps['seedOperator'] = vi.fn(async (url: string, args: ClerkSeedArgs) => {
        expect(url).toBeTruthy();
        return { userId: 'users|seeded', clerkOrgId: args.clerkOrgId, shopId: SHOP_ID };
    });
    const deps: ClerkSetupDeps = { ensureUser, ensureOrg, seedShop, seedOperator };
    return {
        deps,
        ensureUser: vi.mocked(ensureUser),
        ensureOrg: vi.mocked(ensureOrg),
        seedShop: vi.mocked(seedShop),
        seedOperator: vi.mocked(seedOperator),
    };
}

/** A minimal, fully-configured environment for the seed core under test. */
function baseEnv(): NodeJS.ProcessEnv {
    return { CONVEX_URL: 'https://e2e.convex.cloud' } as NodeJS.ProcessEnv;
}

describe('seedE2eClerkOperator', () => {
    it('provisions the Clerk user + org, seeds the shop, then seeds the operator identity model in order', async () => {
        const { deps, ensureUser, ensureOrg, seedShop, seedOperator } = mockDeps();

        const result = await seedE2eClerkOperator(baseEnv(), deps);

        expect(result.user.id).toBe(USER_ID);
        expect(result.org.id).toBe(ORG_ID);
        expect(result.seed.shopId).toBe(SHOP_ID);

        expect(ensureUser).toHaveBeenCalledWith(EMAIL);
        expect(ensureOrg).toHaveBeenCalledWith('nordcom-e2e', 'Nordcom E2E', USER_ID);
        expect(seedShop).toHaveBeenCalledWith('https://e2e.convex.cloud');
        expect(seedOperator).toHaveBeenCalledWith(
            'https://e2e.convex.cloud',
            expect.objectContaining({
                clerkUserId: USER_ID,
                email: EMAIL,
                clerkOrgId: ORG_ID,
                orgSlug: 'nordcom-e2e',
            }),
        );

        const order = [
            ensureUser.mock.invocationCallOrder[0],
            ensureOrg.mock.invocationCallOrder[0],
            seedShop.mock.invocationCallOrder[0],
            seedOperator.mock.invocationCallOrder[0],
        ];
        for (const [index, value] of order.entries()) {
            expect(value).toBeDefined();
            if (index > 0) {
                expect(value ?? 0).toBeGreaterThan(order[index - 1] ?? Number.POSITIVE_INFINITY);
            }
        }
    });

    it('passes the Clerk org id (not its slug) as the shop-owning org', async () => {
        const { deps, seedOperator } = mockDeps();

        await seedE2eClerkOperator(baseEnv(), deps);

        const args = seedOperator.mock.calls[0]?.[1];
        expect(args?.clerkOrgId).toBe(ORG_ID);
    });

    it('rejects (provisioning nothing) when the Convex deployment URL is unset', async () => {
        const env = baseEnv();
        delete env.CONVEX_URL;
        const { deps, ensureUser } = mockDeps();

        await expect(seedE2eClerkOperator(env, deps)).rejects.toBeInstanceOf(MissingEnvironmentVariableError);
        expect(ensureUser).not.toHaveBeenCalled();
    });

    it('falls back to NEXT_PUBLIC_CONVEX_URL when CONVEX_URL is unset', async () => {
        const env = { NEXT_PUBLIC_CONVEX_URL: 'https://public.convex.cloud' } as NodeJS.ProcessEnv;
        const { deps, seedShop } = mockDeps();

        await seedE2eClerkOperator(env, deps);

        expect(seedShop).toHaveBeenCalledWith('https://public.convex.cloud');
    });
});
