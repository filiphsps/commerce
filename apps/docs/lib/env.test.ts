import { ApiErrorKind } from '@nordcom/commerce-errors';
import { describe, expect, it } from 'vitest';
import { resolveDocsEnv } from './env';

describe('resolveDocsEnv', () => {
    it('defaults to empty values in dev', () => {
        const env = resolveDocsEnv({ NODE_ENV: 'development' });
        expect(env.basePath).toBe('');
        expect(env.canonicalUrl).toBe('http://localhost:3002');
    });

    it('reads NEXT_PUBLIC_DOCS_BASE_PATH and ensures leading slash', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            NEXT_PUBLIC_DOCS_BASE_PATH: 'commerce',
            NEXT_PUBLIC_DOCS_CANONICAL_URL: 'https://example.com/commerce',
        });
        expect(env.basePath).toBe('/commerce');
    });

    it('strips trailing slash on canonical URL', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            NEXT_PUBLIC_DOCS_BASE_PATH: '/commerce',
            NEXT_PUBLIC_DOCS_CANONICAL_URL: 'https://example.com/commerce/',
        });
        expect(env.canonicalUrl).toBe('https://example.com/commerce');
    });

    it('throws in production when canonical URL is missing and not on Vercel', () => {
        let thrown: { name?: string; code?: string; description?: string } | undefined;
        try {
            resolveDocsEnv({
                NODE_ENV: 'production',
                NEXT_PUBLIC_DOCS_BASE_PATH: '/commerce',
            });
        } catch (err) {
            thrown = err as { name?: string; code?: string; description?: string };
        }
        expect(thrown).toBeDefined();
        expect(thrown?.name).toBe('MissingEnvironmentVariableError');
        expect(thrown?.code).toBe(ApiErrorKind.API_MISSING_ENVIRONMENT_VARIABLE);
        expect(thrown?.description).toContain('"NEXT_PUBLIC_DOCS_CANONICAL_URL"');
    });

    it('allows empty basePath in production', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            NEXT_PUBLIC_DOCS_BASE_PATH: '',
            NEXT_PUBLIC_DOCS_CANONICAL_URL: 'https://docs.example.com',
        });
        expect(env.basePath).toBe('');
        expect(env.canonicalUrl).toBe('https://docs.example.com');
    });

    it('derives canonical from VERCEL_BRANCH_URL on preview deployments', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            VERCEL: '1',
            VERCEL_ENV: 'preview',
            VERCEL_URL: 'my-app-abc123-acme.vercel.app',
            VERCEL_BRANCH_URL: 'my-app-git-feature-foo-acme.vercel.app',
        });
        expect(env.canonicalUrl).toBe('https://my-app-git-feature-foo-acme.vercel.app');
    });

    it('falls back to VERCEL_URL on preview when branch URL is absent', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            VERCEL: '1',
            VERCEL_ENV: 'preview',
            VERCEL_URL: 'my-app-abc123-acme.vercel.app',
        });
        expect(env.canonicalUrl).toBe('https://my-app-abc123-acme.vercel.app');
    });

    it('derives canonical from VERCEL_PROJECT_PRODUCTION_URL on Vercel production', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            VERCEL: '1',
            VERCEL_ENV: 'production',
            VERCEL_URL: 'my-app-abc123-acme.vercel.app',
            VERCEL_PROJECT_PRODUCTION_URL: 'docs.nordcom.io',
        });
        expect(env.canonicalUrl).toBe('https://docs.nordcom.io');
    });

    it('applies basePath when deriving canonical from Vercel', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            NEXT_PUBLIC_DOCS_BASE_PATH: '/docs',
            VERCEL: '1',
            VERCEL_ENV: 'preview',
            VERCEL_BRANCH_URL: 'my-app-git-feature-foo-acme.vercel.app',
        });
        expect(env.canonicalUrl).toBe('https://my-app-git-feature-foo-acme.vercel.app/docs');
    });

    it('prefers explicit NEXT_PUBLIC_DOCS_CANONICAL_URL over Vercel-derived value', () => {
        const env = resolveDocsEnv({
            NODE_ENV: 'production',
            NEXT_PUBLIC_DOCS_CANONICAL_URL: 'https://docs.nordcom.io',
            VERCEL: '1',
            VERCEL_ENV: 'preview',
            VERCEL_URL: 'my-app-abc123-acme.vercel.app',
            VERCEL_BRANCH_URL: 'my-app-git-feature-foo-acme.vercel.app',
        });
        expect(env.canonicalUrl).toBe('https://docs.nordcom.io');
    });
});
