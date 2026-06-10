/**
 * Native preview-URL builders for the CMS live preview. Replaces the stale
 * Payload-era `buildLivePreviewUrl` (`apps/admin/src/payload.config.ts`) whose
 * `/__by-tenant/…?preview=1` shape never matched any storefront route: the
 * working activation seam is the storefront's `/api/cms-preview` route, which
 * verifies `secret` (timing-safe against `STOREFRONT_PREVIEW_SECRET`), enables
 * `draftMode()`, and redirects to the requested storefront path. These
 * builders are pure so they unit-test without any env/server context; the
 * admin's server-side wrapper supplies the origin + secret.
 */

/**
 * The document target a preview URL points at: the collection decides the
 * storefront route shape, `slug`/`shopifyHandle` the handle, `locale` the
 * path prefix.
 */
export type PreviewTarget = {
    /** Collection slug (`pages`, `articles`, `productMetadata`, `collectionMetadata`, …). */
    collection: string;
    /** Document data; `slug` or `shopifyHandle` becomes the path handle. */
    data: { slug?: string; shopifyHandle?: string };
    /** BCP-47 locale code used as the storefront path prefix. */
    locale: string;
};

/**
 * Maps a document to its tenant-relative storefront path (`/<locale>/…/`,
 * trailing slash per the storefront's `trailingSlash: true` convention).
 * A `pages` document with the `homepage` slug maps to the locale root — the
 * storefront middleware rewrites the index to the `homepage` handle, so the
 * explicit handle in the URL would 301 first. Unknown collections (e.g. the
 * theme editor's `shops` singleton) preview the locale root.
 *
 * @param target - The document target.
 * @returns The tenant-relative storefront path for the document.
 */
export function buildPreviewPath({ collection, data, locale }: PreviewTarget): string {
    const handle = data.slug ?? data.shopifyHandle ?? 'homepage';
    switch (collection) {
        case 'pages':
            return handle === 'homepage' ? `/${locale}/` : `/${locale}/${handle}/`;
        case 'articles':
            return `/${locale}/blog/${handle}/`;
        case 'productMetadata':
            return `/${locale}/products/${handle}/`;
        case 'collectionMetadata':
            return `/${locale}/collections/${handle}/`;
        default:
            return `/${locale}/`;
    }
}

/**
 * Assembles the full preview activation URL: the storefront's
 * `/api/cms-preview` route with the shared secret and the post-activation
 * redirect target. The route 401s on a missing/mismatched secret (fail-closed
 * — an empty secret never matches because the route also rejects an unset
 * `STOREFRONT_PREVIEW_SECRET`), enables draft mode, and bounces to `path`.
 *
 * @param args.storefrontOrigin - The tenant storefront origin (`https://shop.example`).
 * @param args.secret - The shared preview secret (`STOREFRONT_PREVIEW_SECRET`).
 * @param args.path - The tenant-relative redirect path from {@link buildPreviewPath}.
 * @returns The fully-qualified activation URL.
 */
export function buildPreviewActivationUrl({
    storefrontOrigin,
    secret,
    path,
}: {
    storefrontOrigin: string;
    secret: string;
    path: string;
}): string {
    const url = new URL('/api/cms-preview', storefrontOrigin);
    url.searchParams.set('secret', secret);
    url.searchParams.set('redirect', path);
    return url.toString();
}
