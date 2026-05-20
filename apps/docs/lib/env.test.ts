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

    it('throws in production when canonical URL is missing', () => {
        expect(() =>
            resolveDocsEnv({
                NODE_ENV: 'production',
                NEXT_PUBLIC_DOCS_BASE_PATH: '/commerce',
            }),
        ).toThrow(/NEXT_PUBLIC_DOCS_CANONICAL_URL/);
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
});
