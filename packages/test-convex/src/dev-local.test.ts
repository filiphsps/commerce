import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { ConvexHttpClient } from 'convex/browser';
import { ConvexError } from 'convex/values';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    CANONICAL_SEED_DOMAIN,
    convexLocalCliEnv,
    DEV_LOCAL,
    isBackendHealthy,
    isCanonicalSeeded,
    resolveBackendAuthEnv,
    resolveClerkBackendEnv,
    waitForAdminKeyMarker,
    withRetry,
} from './dev-local';

afterEach(() => vi.restoreAllMocks());

describe('DEV_LOCAL constants', () => {
    it('pins the fixed dev backend shape', () => {
        expect(DEV_LOCAL.port).toBe(3210);
        expect(DEV_LOCAL.url).toBe('http://127.0.0.1:3210');
        expect(DEV_LOCAL.dataDir).toBe('.convex-local');
        expect(DEV_LOCAL.serverSecret).toBe('dev-local-secret');
    });
});

describe('convexLocalCliEnv', () => {
    it('targets the self-hosted local backend with the admin key and blanks cloud selectors', () => {
        const env = convexLocalCliEnv('http://127.0.0.1:3210', 'admin-key-123', { PATH: '/bin' });
        expect(env.CONVEX_SELF_HOSTED_URL).toBe('http://127.0.0.1:3210');
        expect(env.CONVEX_SELF_HOSTED_ADMIN_KEY).toBe('admin-key-123');
        expect(env.CONVEX_DEPLOYMENT).toBe('');
        expect(env.CONVEX_DEPLOY_KEY).toBe('');
        expect(env.PATH).toBe('/bin');
    });
});

describe('isBackendHealthy', () => {
    it('is true on a 200 from /instance_name', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(true);
    });

    it('is false when the fetch rejects (nothing listening)', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(false);
    });

    it('is false on a non-200', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(false);
    });
});

describe('resolveBackendAuthEnv', () => {
    it('falls back to the DEV_LOCAL placeholders when no override is present', () => {
        const resolved = resolveBackendAuthEnv({});
        expect(resolved.issuer).toBe(DEV_LOCAL.auth.issuer);
        expect(resolved.applicationId).toBe(DEV_LOCAL.auth.applicationId);
        expect(resolved.jwksUrl).toBe(DEV_LOCAL.auth.jwksUrl);
    });

    it('prefers explicit env overrides (the admin e2e operator-auth wiring)', () => {
        const resolved = resolveBackendAuthEnv({
            CONVEX_AUTH_ISSUER: 'http://localhost:3000',
            CONVEX_AUTH_APPLICATION_ID: 'convex',
            CONVEX_AUTH_JWKS_URL: 'http://localhost:3000/.well-known/jwks.json',
        });
        expect(resolved.issuer).toBe('http://localhost:3000');
        expect(resolved.applicationId).toBe('convex');
        expect(resolved.jwksUrl).toBe('http://localhost:3000/.well-known/jwks.json');
    });

    it('treats a blank override as unset and falls back', () => {
        const resolved = resolveBackendAuthEnv({ CONVEX_AUTH_ISSUER: '   ' });
        expect(resolved.issuer).toBe(DEV_LOCAL.auth.issuer);
    });
});

describe('withRetry', () => {
    it('returns the first successful result without retrying', async () => {
        const fn = vi.fn(() => 'ok');
        expect(await withRetry(fn, { baseDelayMs: 1 })).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries a transient failure and resolves once it succeeds', async () => {
        let calls = 0;
        const fn = vi.fn(() => {
            calls += 1;
            if (calls < 3) throw new ConvexError('wait_for_schema 500');
            return 'pushed';
        });
        expect(await withRetry(fn, { attempts: 3, baseDelayMs: 1 })).toBe('pushed');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('rethrows the last error after exhausting every attempt', async () => {
        const fn = vi.fn(() => {
            throw new ConvexError('persistent push failure');
        });
        await expect(withRetry(fn, { attempts: 2, baseDelayMs: 1 })).rejects.toThrow('persistent push failure');
        expect(fn).toHaveBeenCalledTimes(2);
    });
});

describe('isCanonicalSeeded', () => {
    it('is true when the canonical shop resolves through the server-tier query', async () => {
        const query = vi
            .spyOn(ConvexHttpClient.prototype, 'query')
            .mockResolvedValue({ shop: { _id: 'shop_1' }, flags: [] });
        expect(await isCanonicalSeeded('http://127.0.0.1:3210', 'secret')).toBe(true);
        expect(query).toHaveBeenCalledWith(expect.anything(), {
            serverSecret: 'secret',
            domain: CANONICAL_SEED_DOMAIN,
        });
    });

    it('is false when no shop claims the canonical domain (unseeded deployment)', async () => {
        vi.spyOn(ConvexHttpClient.prototype, 'query').mockResolvedValue(null);
        expect(await isCanonicalSeeded('http://127.0.0.1:3210', 'secret')).toBe(false);
    });

    it('is false when the query throws (functions not pushed / backend unreachable)', async () => {
        vi.spyOn(ConvexHttpClient.prototype, 'query').mockRejectedValue(new ConvexError('module not found'));
        expect(await isCanonicalSeeded('http://127.0.0.1:3210', 'secret')).toBe(false);
    });
});

describe('resolveClerkBackendEnv', () => {
    it('returns empty strings when no Clerk env is present (unit/integration backends)', () => {
        const resolved = resolveClerkBackendEnv({});
        expect(resolved.frontendApiUrl).toBe('');
        expect(resolved.webhookSigningSecret).toBe('');
    });

    it('surfaces the Clerk Frontend API URL + webhook secret for the admin e2e operator-auth wiring', () => {
        const resolved = resolveClerkBackendEnv({
            CLERK_FRONTEND_API_URL: 'https://internal-roughy-49.clerk.accounts.dev',
            CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test',
        });
        expect(resolved.frontendApiUrl).toBe('https://internal-roughy-49.clerk.accounts.dev');
        expect(resolved.webhookSigningSecret).toBe('whsec_test');
    });

    it('treats a blank value as unset', () => {
        const resolved = resolveClerkBackendEnv({ CLERK_FRONTEND_API_URL: '   ' });
        expect(resolved.frontendApiUrl).toBe('');
    });
});

describe('waitForAdminKeyMarker', () => {
    it('returns the trimmed key once the daemon writes the marker after backend health', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'test-convex-marker-'));
        const marker = join(dir, '.admin-key');
        try {
            // The detached daemon persists the marker AFTER the backend is HTTP-healthy; emulate that lag.
            void sleep(100).then(() => writeFileSync(marker, 'admin-key-xyz\n'));
            expect(await waitForAdminKeyMarker(marker, 5_000, 25)).toBe('admin-key-xyz');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when the marker never appears within the budget', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'test-convex-marker-'));
        const marker = join(dir, '.admin-key');
        try {
            await expect(waitForAdminKeyMarker(marker, 150, 25)).rejects.toThrow('admin-key marker missing');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('keeps waiting on an empty marker until a non-empty value lands', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'test-convex-marker-'));
        const marker = join(dir, '.admin-key');
        try {
            writeFileSync(marker, '   ');
            void sleep(100).then(() => writeFileSync(marker, 'late-key'));
            expect(await waitForAdminKeyMarker(marker, 5_000, 25)).toBe('late-key');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
