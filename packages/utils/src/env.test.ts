import { describe, expect, it } from 'vitest';
import { resolveBuildEnv } from './env';

describe('resolveBuildEnv', () => {
    it('returns development when NODE_ENV is development', () => {
        const env = resolveBuildEnv({ NODE_ENV: 'development', VERCEL_ENV: undefined });
        expect(env.isDev).toBe(true);
        expect(env.environment).toBe('development');
    });

    it('returns preview when VERCEL_ENV is preview', () => {
        const env = resolveBuildEnv({ NODE_ENV: 'production', VERCEL_ENV: 'preview' });
        expect(env.isDev).toBe(false);
        expect(env.environment).toBe('preview');
    });

    it('returns production when nothing matches development or preview', () => {
        const env = resolveBuildEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production' });
        expect(env.isDev).toBe(false);
        expect(env.environment).toBe('production');
    });

    it('uses provided GIT_COMMIT_SHA when set', () => {
        const env = resolveBuildEnv({ NODE_ENV: 'production', GIT_COMMIT_SHA: 'abc123' });
        expect(env.gitSHA).toBe('abc123');
    });

    it('falls back to VERCEL_GIT_COMMIT_SHA when GIT_COMMIT_SHA missing', () => {
        const env = resolveBuildEnv({ NODE_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'def456' });
        expect(env.gitSHA).toBe('def456');
    });

    it('returns a non-empty SHA string when no env values provided', () => {
        const env = resolveBuildEnv({ NODE_ENV: 'production' });
        expect(typeof env.gitSHA).toBe('string');
        expect(env.gitSHA.length).toBeGreaterThan(0);
    });
});
