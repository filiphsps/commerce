import { describe, expect, it } from 'vitest';

import { buildPreviewActivationUrl, buildPreviewPath } from './url';

describe('buildPreviewPath', () => {
    it('maps each previewable collection to its storefront route shape', () => {
        expect(buildPreviewPath({ collection: 'pages', data: { slug: 'about' }, locale: 'en-US' })).toBe(
            '/en-US/about/',
        );
        expect(buildPreviewPath({ collection: 'articles', data: { slug: 'launch' }, locale: 'de-DE' })).toBe(
            '/de-DE/blog/launch/',
        );
        expect(
            buildPreviewPath({ collection: 'productMetadata', data: { shopifyHandle: 'mug' }, locale: 'en-US' }),
        ).toBe('/en-US/products/mug/');
        expect(
            buildPreviewPath({ collection: 'collectionMetadata', data: { shopifyHandle: 'sale' }, locale: 'en-US' }),
        ).toBe('/en-US/collections/sale/');
    });

    it('maps the homepage slug and unknown collections to the locale root', () => {
        expect(buildPreviewPath({ collection: 'pages', data: { slug: 'homepage' }, locale: 'en-US' })).toBe('/en-US/');
        expect(buildPreviewPath({ collection: 'pages', data: {}, locale: 'en-US' })).toBe('/en-US/');
        expect(buildPreviewPath({ collection: 'shops', data: {}, locale: 'en-GB' })).toBe('/en-GB/');
    });
});

describe('buildPreviewActivationUrl', () => {
    it('targets the cms-preview activation route with secret and redirect', () => {
        const url = new URL(
            buildPreviewActivationUrl({
                storefrontOrigin: 'https://shop.example.com',
                secret: 's3cret/+value',
                path: '/en-US/about/',
            }),
        );
        expect(url.origin).toBe('https://shop.example.com');
        expect(url.pathname).toBe('/api/cms-preview');
        expect(url.searchParams.get('secret')).toBe('s3cret/+value');
        expect(url.searchParams.get('redirect')).toBe('/en-US/about/');
    });

    it('preserves an explicit port on the storefront origin (dev)', () => {
        const url = new URL(
            buildPreviewActivationUrl({
                storefrontOrigin: 'http://storefront.localhost:1337',
                secret: 'dev',
                path: '/en-US/',
            }),
        );
        expect(url.host).toBe('storefront.localhost:1337');
        expect(url.protocol).toBe('http:');
    });
});
