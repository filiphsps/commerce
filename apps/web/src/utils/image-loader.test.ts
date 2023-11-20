import { ImageLoader } from '@/utils/image-loader';
import { describe, expect, it } from 'vitest';

describe('utils', () => {
    describe('ImageLoader', () => {
        it('should return the correct URL for images from images.prismic.io', () => {
            const src = 'https://images.prismic.io/my-image.jpg';
            const width = 500;
            const quality = 80;

            const result = ImageLoader({ src, width, quality } as any);
            expect(result).toBe(`${src}?w=${width}&q=${quality}&fm=avif`);
        });
        it('should return the correct URL when fm is set', () => {
            const src = 'https://images.prismic.io/my-image.jpg?fm=avif';
            const result = ImageLoader({ src } as any);
            expect(result).toBe(src);
        });

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
    });
});
