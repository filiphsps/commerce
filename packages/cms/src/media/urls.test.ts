import { describe, expect, it } from 'vitest';

import { MEDIA_IMAGE_SIZES } from './sizes';
import { mediaDerivativeStorageKey, mediaUrlForStorageKey, resolveMediaCdnBaseUrl } from './urls';

const [THUMBNAIL] = MEDIA_IMAGE_SIZES;

describe('resolveMediaCdnBaseUrl', () => {
    it('prefers MEDIA_CDN_BASE_URL over the legacy R2_PUBLIC_ENDPOINT', () => {
        expect(
            resolveMediaCdnBaseUrl({
                MEDIA_CDN_BASE_URL: 'https://cdn.example.com',
                R2_PUBLIC_ENDPOINT: 'https://r2.example.com',
            }),
        ).toBe('https://cdn.example.com');
    });

    it('falls back to R2_PUBLIC_ENDPOINT and normalizes trailing slashes', () => {
        expect(resolveMediaCdnBaseUrl({ R2_PUBLIC_ENDPOINT: 'https://r2.example.com//' })).toBe(
            'https://r2.example.com',
        );
    });

    it('treats empty and whitespace-only values as unset', () => {
        expect(resolveMediaCdnBaseUrl({ MEDIA_CDN_BASE_URL: '   ', R2_PUBLIC_ENDPOINT: '' })).toBeNull();
        expect(resolveMediaCdnBaseUrl({})).toBeNull();
    });
});

describe('mediaUrlForStorageKey', () => {
    it('joins base and key with exactly one slash, key verbatim (legacy generateFileURL parity)', () => {
        expect(mediaUrlForStorageKey('https://r2.example.com', 'shop-a/photo.png')).toBe(
            'https://r2.example.com/shop-a/photo.png',
        );
        expect(mediaUrlForStorageKey('https://r2.example.com/', 'a file.png')).toBe(
            'https://r2.example.com/a file.png',
        );
    });
});

describe('mediaDerivativeStorageKey', () => {
    it('inserts the -WxH suffix before the extension, preserving the prefix', () => {
        expect(mediaDerivativeStorageKey('shop-a/photo.png', THUMBNAIL)).toBe('shop-a/photo-320x240.png');
    });

    it('derives every frozen size deterministically', () => {
        expect(MEDIA_IMAGE_SIZES.map((size) => mediaDerivativeStorageKey('hero.jpg', size))).toEqual([
            'hero-320x240.jpg',
            'hero-768x576.jpg',
            'hero-1280x720.jpg',
            'hero-1920x1080.jpg',
        ]);
    });

    it('handles extensionless and dotfile names with a plain suffix', () => {
        expect(mediaDerivativeStorageKey('shop-a/photo', THUMBNAIL)).toBe('shop-a/photo-320x240');
        expect(mediaDerivativeStorageKey('.hidden', THUMBNAIL)).toBe('.hidden-320x240');
    });
});
