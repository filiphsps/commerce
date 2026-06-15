import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDevelopment, isProduction } from './runtime-env';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('isProduction', () => {
    it('is true on a production deploy', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(isProduction()).toBe(true);
    });

    it('is true when NODE_ENV is production and VERCEL_ENV is unset (self-hosted / browser)', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', undefined);
        expect(isProduction()).toBe(true);
    });

    it('is false on a Vercel preview deploy even though NODE_ENV is production', () => {
        // The exact gap that surfaced the live-chat bug: previews build with NODE_ENV=production.
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'preview');
        expect(isProduction()).toBe(false);
    });

    it('is false in local development', () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('VERCEL_ENV', undefined);
        expect(isProduction()).toBe(false);
    });

    it('is false under test', () => {
        vi.stubEnv('NODE_ENV', 'test');
        vi.stubEnv('VERCEL_ENV', undefined);
        expect(isProduction()).toBe(false);
    });
});

describe('isDevelopment', () => {
    it('is true when NODE_ENV is development', () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('VERCEL_ENV', undefined);
        expect(isDevelopment()).toBe(true);
    });

    it('is true on a Vercel development environment regardless of NODE_ENV', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'development');
        expect(isDevelopment()).toBe(true);
    });

    it('is false on a production deploy', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'production');
        expect(isDevelopment()).toBe(false);
    });

    it('is false on a Vercel preview deploy', () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'preview');
        expect(isDevelopment()).toBe(false);
    });

    it('is false under test', () => {
        vi.stubEnv('NODE_ENV', 'test');
        vi.stubEnv('VERCEL_ENV', undefined);
        expect(isDevelopment()).toBe(false);
    });
});

describe('isProduction / isDevelopment', () => {
    it('are mutually exclusive across every tier', () => {
        for (const [nodeEnv, vercelEnv] of [
            ['production', 'production'],
            ['production', 'preview'],
            ['production', undefined],
            ['development', undefined],
            ['development', 'development'],
            ['test', undefined],
        ] as const) {
            vi.stubEnv('NODE_ENV', nodeEnv);
            vi.stubEnv('VERCEL_ENV', vercelEnv);
            expect(isProduction() && isDevelopment()).toBe(false);
        }
    });
});
