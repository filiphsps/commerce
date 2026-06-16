import type { ImageLoader as ImageLoaderType } from 'next/image';

// Shopify CDN hosts. Their `preferredContentType: WEBP` URLs (`*.jpg.webp`) IGNORE the `?width=`
// query param entirely — resizing only happens through the filename size suffix (`Hoodie_512x.jpg.webp`).
// That is why an earlier `?width=` loader was inert and a product gallery decoded full 4096² sources,
// Jetsam-killing iOS Safari tabs.
const SHOPIFY_HOSTS = /(^|\.)(shopify\.com|shopifycdn\.com)$/i;

// First image extension in the basename. Shopify's size token sits immediately before it, ahead of any
// format-conversion extension — `Hoodie.jpg.webp` → `Hoodie_512x.jpg.webp` (NOT `Hoodie.jpg_512x.webp`,
// which 404s). The lookahead keeps `match.index` pointing at the start of the extension chain.
const SHOPIFY_EXT = /\.(?:jpe?g|png|webp|gif|avif)(?=\.|$|\?)/i;

/**
 * Resizes a Shopify CDN image URL via the filename size suffix, preserving the extension chain (so a
 * `.jpg.webp` stays webp). Strips any existing `_NxM` token first, so re-resizing a server-capped URL
 * (`maxWidth` from GraphQL) composes cleanly.
 *
 * @param src - The original Shopify CDN image URL.
 * @param width - Requested pixel width.
 * @returns The resized URL, or `null` when `src` is not a resolvable Shopify CDN image.
 */
const shopifyResize = (src: string, width: number): string | null => {
    let url: URL;
    try {
        url = new URL(src);
    } catch {
        return null;
    }
    if (!SHOPIFY_HOSTS.test(url.hostname)) return null;

    const segments = url.pathname.split('/');
    const file = segments[segments.length - 1] ?? '';
    const ext = file.match(SHOPIFY_EXT);
    if (!ext || ext.index === undefined) return null;

    const stem = file.slice(0, ext.index).replace(/_\d+x\d*$/, '');
    segments[segments.length - 1] = `${stem}_${width}x${file.slice(ext.index)}`;
    url.pathname = segments.join('/');
    return url.toString();
};

/**
 * Next.js image loader. For Shopify CDN images it builds the filename-suffix transform Shopify
 * actually honors (preserving webp); for any other host it appends generic `width`/`quality` query
 * params. Wired globally via `next.config.js` `images.loaderFile`, so `next/image` emits a correctly
 * resized `srcset` for every image on the site.
 *
 * @param src - The original image URL.
 * @param width - Requested pixel width; omitted from generic URLs when falsy.
 * @param quality - Requested image quality (1–100) for generic URLs; Shopify sizing ignores it.
 * @returns The resized/parameterized source URL.
 */
export const fallbackLoader: ImageLoaderType = ({ src, width, quality }) => {
    const shopify = width ? shopifyResize(src, width) : null;
    if (shopify) return shopify;

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

// Default export so `next.config.js` can wire this as `images.loaderFile`.
export default fallbackLoader;
