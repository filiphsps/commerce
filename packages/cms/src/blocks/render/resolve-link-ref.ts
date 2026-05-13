import type { LocaleRef, LinkRef } from './types';

/**
 * Renderer-local link resolver. Mirrors the api/resolve-link helper but
 * accepts the looser `LinkRef` shape emitted by Payload — the latter can
 * leave `kind` undefined (legacy data), populate relationships to either
 * an id string or a full object, or carry a raw `url`. The block
 * renderers only need a final href string and an optional newTab flag.
 *
 * Returns `null` when the link is unfilled or malformed so callers can
 * fall through to rendering the inner element bare instead of wrapping
 * a useless anchor.
 */
export const resolveLinkRef = (
    link: LinkRef | null | undefined,
    { locale }: { locale: LocaleRef },
): { href: string; openInNewTab: boolean } | null => {
    if (!link) return null;
    const openInNewTab = Boolean(link.openInNewTab);
    const slugOf = (v: { slug?: string } | string | null | undefined): string | undefined =>
        typeof v === 'string' || !v ? undefined : v.slug;
    const handleOf = (v: { shopifyHandle?: string } | string | null | undefined): string | undefined =>
        typeof v === 'string' || !v ? undefined : v.shopifyHandle;

    switch (link.kind) {
        case 'external':
            return link.url ? { href: link.url, openInNewTab } : null;
        case 'anchor':
            return link.url ? { href: `#${link.url.replace(/^#/, '')}`, openInNewTab } : null;
        case 'page': {
            const slug = slugOf(link.page);
            return slug ? { href: `/${locale.code}/${slug}/`, openInNewTab } : null;
        }
        case 'article': {
            const slug = slugOf(link.article);
            return slug ? { href: `/${locale.code}/blog/${slug}/`, openInNewTab } : null;
        }
        case 'product': {
            const handle = handleOf(link.product);
            return handle ? { href: `/${locale.code}/products/${handle}/`, openInNewTab } : null;
        }
        case 'collection': {
            const handle = handleOf(link.collectionRef);
            return handle ? { href: `/${locale.code}/collections/${handle}/`, openInNewTab } : null;
        }
        default:
            // Pre-`kind` data — only `url` is set. Treat as external for
            // back-compat so existing CMS docs don't suddenly stop linking.
            return link.url ? { href: link.url, openInNewTab } : null;
    }
};
