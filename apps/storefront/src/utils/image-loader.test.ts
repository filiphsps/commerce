import { describe, expect, it } from 'vitest';

import { fallbackLoader as ImageLoader } from '@/utils/image-loader';

describe('utils', () => {
    describe('ImageLoader', () => {
        it('should return the correct URL for other images', () => {
            const src = 'https://example.com/my-image.jpg';
            const width = 500;
            const quality = 80;

            const result = ImageLoader({ src, width, quality } as any);
            expect(result).toBe(`${src}?width=${width}&quality=${quality}`);
        });

        it('should return the correct URL for other images without quality', () => {
            const src = 'https://example.com/my-image.jpg';
            const width = 500;

            const result = ImageLoader({ src, width } as any);
            expect(result).toBe(`${src}?width=${width}`);
        });

        it('should return the correct URL for other images without width', () => {
            const src = 'https://example.com/my-image.jpg';
            const quality = 80;

            const result = ImageLoader({ src, quality } as any);
            expect(result).toBe(`${src}?quality=${quality}`);
        });

        it('should return the correct URL for other images without width and quality', () => {
            const src = 'https://example.com/my-image.jpg';

            const result = ImageLoader({ src } as any);
            expect(result).toBe(src);
        });

        it('should return the correct URL for other images without width and quality and with a query string', () => {
            const src = 'https://example.com/my-image.jpg?foo=bar';

            const result = ImageLoader({ src } as any);
            expect(result).toBe(src);
        });

        // Shopify CDN ignores `?width=` on `preferredContentType: WEBP` URLs; resizing only works via
        // the filename size suffix, before the extension chain, preserving webp.
        it('resizes a Shopify webp URL via the filename suffix, preserving the extension chain', () => {
            const src = 'https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenHoodie01.jpg.webp?v=1739549';
            const result = ImageLoader({ src, width: 512 } as any);
            expect(result).toBe(
                'https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenHoodie01_512x.jpg.webp?v=1739549',
            );
        });

        it('replaces an existing size token rather than stacking (server maxWidth composes)', () => {
            const src = 'https://cdn.shopify.com/s/files/1/0688/products/Hoodie_2048x.jpg.webp?v=1';
            const result = ImageLoader({ src, width: 320 } as any);
            expect(result).toBe('https://cdn.shopify.com/s/files/1/0688/products/Hoodie_320x.jpg.webp?v=1');
        });

        it('resizes a single-extension Shopify URL', () => {
            const src = 'https://cdn.shopify.com/s/files/1/0688/products/Clay.jpg?v=2';
            const result = ImageLoader({ src, width: 128 } as any);
            expect(result).toBe('https://cdn.shopify.com/s/files/1/0688/products/Clay_128x.jpg?v=2');
        });

        it('leaves a Shopify URL untouched when no width is requested', () => {
            const src = 'https://cdn.shopify.com/s/files/1/0688/products/Clay.jpg.webp?v=2';
            expect(ImageLoader({ src } as any)).toBe(src);
        });
    });
});
