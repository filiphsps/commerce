import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    convexLocalCliEnv,
    DEV_LOCAL,
    isBackendHealthy,
    resolveBackendAuthEnv,
    waitForAdminKeyMarker,
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
