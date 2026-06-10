import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildStorefrontPreviewUrl } from '@/lib/storefront-preview';

describe('buildStorefrontPreviewUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('targets the tenant storefront origin by default (tenant-resolving hostname)', () => {
        vi.stubEnv('STOREFRONT_BASE_URL', '');
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', 'preview-secret');
        const url = new URL(
            buildStorefrontPreviewUrl({
                domain: 'acme.example.com',
                collection: 'pages',
                data: { slug: 'about' },
                locale: 'en-US',
            }),
        );
        expect(url.origin).toBe('https://acme.example.com');
        expect(url.pathname).toBe('/api/cms-preview');
        expect(url.searchParams.get('secret')).toBe('preview-secret');
        expect(url.searchParams.get('redirect')).toBe('/en-US/about/');
    });

    it('honors the STOREFRONT_BASE_URL dev override', () => {
        vi.stubEnv('STOREFRONT_BASE_URL', 'http://storefront.localhost:1337');
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', 'preview-secret');
        const url = new URL(
            buildStorefrontPreviewUrl({ domain: 'acme.example.com', collection: 'shops', data: {}, locale: 'en-US' }),
        );
        expect(url.host).toBe('storefront.localhost:1337');
        expect(url.searchParams.get('redirect')).toBe('/en-US/');
    });

    it('emits an empty secret when unset — the storefront route rejects it (fail-closed)', () => {
        vi.stubEnv('STOREFRONT_BASE_URL', '');
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', '');
        const url = new URL(
            buildStorefrontPreviewUrl({ domain: 'acme.example.com', collection: 'pages', data: {}, locale: 'en-US' }),
        );
        expect(url.searchParams.get('secret')).toBe('');
    });
});
