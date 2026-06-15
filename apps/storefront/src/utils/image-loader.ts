import type { ImageLoader as ImageLoaderType } from 'next/image';

/**
 * Next.js image loader that appends `width` and `quality` query parameters to the source URL for image services that accept generic query strings.
 *
 * @param src - The original image URL.
 * @param width - Requested pixel width; omitted from the URL when falsy.
 * @param quality - Requested image quality (1–100); omitted from the URL when falsy.
 * @returns The source URL with any non-falsy parameters appended.
 */
export const fallbackLoader: ImageLoaderType = ({ src, width, quality }) => {
    const params: string[] = [];
    if (width) {
        params.push(`width=${width}`);
    }
    if (quality) {
        params.push(`quality=${quality}`);
    }

    const div = src.includes('?') ? '&' : '?';
    return `${src}${params.length > 0 ? div : ''}${params.join('&')}`;
};

// Default export so `next.config.js` can wire this as `images.loaderFile`. With a custom loader Next
// emits a `srcset` of width-parameterized URLs (Shopify CDN resizes on `?width=`) WITHOUT routing
// through Vercel's optimizer — so a 44px thumbnail fetches a ~75px image instead of decoding the full
// 4096² source. That full-resolution decode (≈1GB across a gallery) is what crashed iOS Safari tabs.
export default fallbackLoader;
