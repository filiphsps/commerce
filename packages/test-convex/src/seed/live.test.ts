import { describe, expect, it } from 'vitest';

import { buildSeedCliEnv } from './live';

describe('buildSeedCliEnv', () => {
    it('prefers the self-hosted admin-key pair and blanks the cloud selectors', () => {
        const env = buildSeedCliEnv('http://127.0.0.1:3210', {
            CONVEX_SELF_HOSTED_ADMIN_KEY: 'admin-key',
            CONVEX_DEPLOY_KEY: 'deploy-key',
            CONVEX_DEPLOYMENT: 'dev:something',
        });

        expect(env.CONVEX_SELF_HOSTED_URL).toBe('http://127.0.0.1:3210');
        expect(env.CONVEX_SELF_HOSTED_ADMIN_KEY).toBe('admin-key');
        expect(env.CONVEX_DEPLOY_KEY).toBe('');
        expect(env.CONVEX_DEPLOYMENT).toBe('');
    });

    it('falls back to a deploy key and blanks the self-hosted pair', () => {
        const env = buildSeedCliEnv('https://example.convex.cloud', {
            CONVEX_DEPLOY_KEY: 'deploy-key',
            CONVEX_DEPLOYMENT: 'dev:something',
        });

        expect(env.CONVEX_DEPLOY_KEY).toBe('deploy-key');
        expect(env.CONVEX_SELF_HOSTED_URL).toBe('');
        expect(env.CONVEX_SELF_HOSTED_ADMIN_KEY).toBe('');
        expect(env.CONVEX_DEPLOYMENT).toBe('');
    });

    it('throws when no CLI credential is present', () => {
        expect(() => buildSeedCliEnv('https://example.convex.cloud', {})).toThrowError(
            /CONVEX_SELF_HOSTED_ADMIN_KEY .*or CONVEX_DEPLOY_KEY/,
        );
    });
});
