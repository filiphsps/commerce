import type { Preloaded } from 'convex/react';
import { getFunctionName } from 'convex/server';
import type { Session } from 'next-auth';
import { describe, expect, it, vi } from 'vitest';
import type { AccountProfileQuery } from '@/components/convex/account-profile-contract';
import {
    type AccountProfilePreloader,
    type AccountProfileProvisioner,
    accountProfileProvisionReference,
    accountProfileQueryReference,
    isAccountLiveIslandKilled,
    mintAccountConvexToken,
    preloadAccountProfile,
    toAccountProfileSnapshot,
} from './account-live-island';

// The real `preloadQuery`/`fetchMutation` perform `no-store` HTTP round-trips
// against the deployment; the seam under test injects its own preloader and
// provisioner, so the module import is stubbed to keep the suite network-free.
vi.mock('convex/nextjs', () => ({
    preloadQuery: vi.fn(),
    fetchMutation: vi.fn(),
}));

/**
 * Builds a minimal authenticated customer session fixture.
 *
 * @param user - Overrides for the session's user slice.
 * @returns A NextAuth session shaped like the storefront's customer session.
 */
function sessionFixture(user: Partial<NonNullable<Session['user']>> | null = {}): Session {
    return {
        expires: '2099-01-01T00:00:00.000Z',
        user:
            user === null
                ? undefined
                : {
                      id: 'customer-1',
                      name: 'Jane Customer',
                      email: 'jane@example.com',
                      image: null,
                      ...user,
                  },
    } as Session;
}

/** A sentinel `Preloaded` handle; opaque to the seam, so a bare object suffices. */
const PRELOADED = { _name: 'account/profile:get' } as unknown as Preloaded<AccountProfileQuery>;

/**
 * Builds an env fixture. The repo's `ProcessEnv` augmentation requires
 * `NODE_ENV`, so the fixture always carries it.
 *
 * @param overrides - Variables layered over the baseline.
 * @returns A `ProcessEnv`-shaped fixture.
 */
function envFixture(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
    return { NODE_ENV: 'test', ...overrides } as NodeJS.ProcessEnv;
}

/**
 * Baseline env where the live island is fully enabled.
 *
 * @param overrides - Variables layered over the live baseline.
 * @returns An env with a deployment URL and no kill switch.
 */
function liveEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
    return envFixture({ NEXT_PUBLIC_CONVEX_URL: 'https://colorful-aardvark-6.convex.cloud', ...overrides });
}

describe('isAccountLiveIslandKilled', () => {
    it('stays enabled when the variable is unset or set to a non-kill value', () => {
        expect(isAccountLiveIslandKilled(envFixture())).toBe(false);
        expect(isAccountLiveIslandKilled(envFixture({ STOREFRONT_ACCOUNT_LIVE_ISLAND: '1' }))).toBe(false);
        expect(isAccountLiveIslandKilled(envFixture({ STOREFRONT_ACCOUNT_LIVE_ISLAND: 'on' }))).toBe(false);
    });

    it('kills the surface for every documented kill value, case-insensitively', () => {
        for (const value of ['0', 'false', 'off', 'disabled', 'OFF', ' Disabled ']) {
            expect(isAccountLiveIslandKilled(envFixture({ STOREFRONT_ACCOUNT_LIVE_ISLAND: value }))).toBe(true);
        }
    });
});

describe('toAccountProfileSnapshot', () => {
    it('projects the session user onto the snapshot shape', () => {
        expect(toAccountProfileSnapshot(sessionFixture({ image: 'https://cdn.example.com/a.png' }))).toEqual({
            id: 'customer-1',
            name: 'Jane Customer',
            email: 'jane@example.com',
            image: 'https://cdn.example.com/a.png',
        });
    });

    it('normalizes a session without a user to all-null fields', () => {
        expect(toAccountProfileSnapshot(sessionFixture(null))).toEqual({
            id: null,
            name: null,
            email: null,
            image: null,
        });
    });
});

describe('accountProfileQueryReference', () => {
    it('addresses the identity-derived account profile query by wire name', () => {
        expect(getFunctionName(accountProfileQueryReference())).toBe('account/profile:get');
    });
});

describe('accountProfileProvisionReference', () => {
    it('addresses the first-visit provisioning mutation by wire name', () => {
        expect(getFunctionName(accountProfileProvisionReference())).toBe('account/profile:provision');
    });
});

describe('mintAccountConvexToken', () => {
    it('issues no token while the RS256 signing env is unconfigured (snapshot-only by contract)', async () => {
        await expect(mintAccountConvexToken({ email: 'jane@example.com' })).resolves.toBeNull();
    });

    it('mints the customer JWT in-process once the signing env is configured', async () => {
        const { generateKeyPairSync } = await import('node:crypto');
        const pem = generateKeyPairSync('rsa', { modulusLength: 2048 })
            .privateKey.export({ type: 'pkcs8', format: 'pem' })
            .toString();
        vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', pem);
        vi.stubEnv('CONVEX_AUTH_ISSUER', 'https://storefront.test.nordcom.io');
        vi.stubEnv('CONVEX_AUTH_APPLICATION_ID', 'convex-storefront');
        try {
            const token = await mintAccountConvexToken({ email: 'jane@example.com', id: 'customer-1' });
            expect(token?.split('.')).toHaveLength(3);
        } finally {
            vi.unstubAllEnvs();
        }
    });
});

describe('preloadAccountProfile', () => {
    it('downgrades to the snapshot when the per-surface kill switch is on, without minting or preloading', async () => {
        const mint = vi.fn(async () => 'token');
        const preload = vi.fn(async () => PRELOADED);

        const result = await preloadAccountProfile(sessionFixture(), {
            mint,
            preload,
            env: liveEnv({ STOREFRONT_ACCOUNT_LIVE_ISLAND: 'off' }),
        });

        expect(result).toBeNull();
        expect(mint).not.toHaveBeenCalled();
        expect(preload).not.toHaveBeenCalled();
    });

    it('downgrades to the snapshot when no deployment URL is configured', async () => {
        const mint = vi.fn(async () => 'token');
        const preload = vi.fn(async () => PRELOADED);

        const result = await preloadAccountProfile(sessionFixture(), { mint, preload, env: envFixture() });

        expect(result).toBeNull();
        expect(mint).not.toHaveBeenCalled();
        expect(preload).not.toHaveBeenCalled();
    });

    it('downgrades to the snapshot when the session carries no email to mint for', async () => {
        const mint = vi.fn(async () => 'token');
        const preload = vi.fn(async () => PRELOADED);

        const result = await preloadAccountProfile(sessionFixture({ email: '   ' }), {
            mint,
            preload,
            env: liveEnv(),
        });

        expect(result).toBeNull();
        expect(mint).not.toHaveBeenCalled();
        expect(preload).not.toHaveBeenCalled();
    });

    it('downgrades to the snapshot when no token can be minted', async () => {
        const preload = vi.fn(async () => PRELOADED);

        const result = await preloadAccountProfile(sessionFixture(), {
            mint: async () => null,
            preload,
            env: liveEnv(),
        });

        expect(result).toBeNull();
        expect(preload).not.toHaveBeenCalled();
    });

    it('preloads the account profile query with the customer token when the surface is live', async () => {
        const preload = vi.fn<AccountProfilePreloader>(async () => PRELOADED);

        const result = await preloadAccountProfile(sessionFixture(), {
            mint: async () => 'minted-jwt',
            preload,
            env: liveEnv(),
        });

        expect(result).toBe(PRELOADED);
        expect(preload).toHaveBeenCalledTimes(1);
        const call = preload.mock.calls[0];
        expect(call).toBeDefined();
        if (!call) {
            return;
        }
        const [query, args, options] = call;
        expect(getFunctionName(query)).toBe('account/profile:get');
        expect(args).toEqual({});
        expect(options).toEqual({ token: 'minted-jwt' });
    });

    it('renders the read-only snapshot on auth failure: a rejecting preload yields null instead of throwing', async () => {
        const preload = vi.fn(async () => {
            throw new TypeError('Convex rejected the bearer token');
        });

        const result = await preloadAccountProfile(sessionFixture(), {
            mint: async () => 'expired-jwt',
            preload,
            env: liveEnv(),
        });

        expect(result).toBeNull();
        expect(preload).toHaveBeenCalledTimes(1);
    });

    it('provisions the customer users row on the authenticated branch, before the preload and with the same token', async () => {
        const order: string[] = [];
        const provision = vi.fn<AccountProfileProvisioner>(async () => {
            order.push('provision');
            return { created: true };
        });
        const preload = vi.fn<AccountProfilePreloader>(async () => {
            order.push('preload');
            return PRELOADED;
        });

        const result = await preloadAccountProfile(sessionFixture(), {
            mint: async () => 'minted-jwt',
            provision,
            preload,
            env: liveEnv(),
        });

        expect(result).toBe(PRELOADED);
        expect(order).toEqual(['provision', 'preload']);
        const call = provision.mock.calls[0];
        expect(call).toBeDefined();
        if (!call) {
            return;
        }
        const [mutation, args, options] = call;
        expect(getFunctionName(mutation)).toBe('account/profile:provision');
        expect(args).toEqual({});
        expect(options).toEqual({ token: 'minted-jwt' });
    });

    it('never provisions on the unauthenticated/degraded branches (kill switch, no email, no token)', async () => {
        const provision = vi.fn<AccountProfileProvisioner>(async () => ({ created: true }));
        const preload = vi.fn(async () => PRELOADED);

        await preloadAccountProfile(sessionFixture(), {
            mint: async () => 'token',
            provision,
            preload,
            env: liveEnv({ STOREFRONT_ACCOUNT_LIVE_ISLAND: 'off' }),
        });
        await preloadAccountProfile(sessionFixture({ email: '   ' }), {
            mint: async () => 'token',
            provision,
            preload,
            env: liveEnv(),
        });
        await preloadAccountProfile(sessionFixture(), {
            mint: async () => null,
            provision,
            preload,
            env: liveEnv(),
        });

        expect(provision).not.toHaveBeenCalled();
        expect(preload).not.toHaveBeenCalled();
    });

    it('still preloads when provisioning rejects — the preload decides live versus snapshot', async () => {
        const provision = vi.fn<AccountProfileProvisioner>(async () => {
            throw new TypeError('provisioning hiccup');
        });
        const preload = vi.fn<AccountProfilePreloader>(async () => PRELOADED);

        const result = await preloadAccountProfile(sessionFixture(), {
            mint: async () => 'minted-jwt',
            provision,
            preload,
            env: liveEnv(),
        });

        expect(result).toBe(PRELOADED);
        expect(provision).toHaveBeenCalledTimes(1);
        expect(preload).toHaveBeenCalledTimes(1);
    });
});
