import type { Locale } from '@/utils/locale';

/**
 * Loose mirror of the LinkRef shape that Payload's `linkField` emits.
 * Payload returns either a string id (when the relation isn't populated) or
 * the populated relation object, so each target field is `string | { … } | null`.
 */
export type LinkRef = {
    kind?: 'page' | 'article' | 'product' | 'collection' | 'external' | 'anchor';
    page?: { slug?: string } | string | null;
    article?: { slug?: string } | string | null;
    product?: { shopifyHandle?: string } | string | null;
    collectionRef?: { shopifyHandle?: string } | string | null;
    url?: string;
    label?: string;
    openInNewTab?: boolean;
};

// `kind: 'external'` (and the legacy default branch) ships a freeform URL
// straight into an `<a href>`. Without a scheme check, an editor can paste
// `javascript:alert(1)` (or `data:text/html,...`) and the anchor fires it on
// click. Allow only the safe web/contact schemes; drop everything else.
const SAFE_SCHEME = /^(?:https?|mailto|tel):/i;
// Pre-`kind` data sometimes stored bare paths or hash fragments. Those are
// fine — only block embedded scripts.
const SAFE_RELATIVE = /^(?:\/|#|\?)/;
/**
 * Returns `true` when `raw` is a URL that the browser can navigate to safely:
 * an absolute URL with an `http`, `https`, `mailto`, or `tel` scheme, or a
 * relative path/fragment/query string. Blocks `javascript:`, `data:`, and
 * any other scheme that could execute code on click.
 *
 * @param raw - The raw URL string to validate.
 * @returns Whether the URL is safe to use as an anchor `href`.
 */
const isSafeExternalUrl = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    if (SAFE_RELATIVE.test(trimmed)) return true;
    return SAFE_SCHEME.test(trimmed);
};

/**
 * Extracts the `slug` from a Payload relation field that may be a bare ID
 * string (not populated) or an object, returning `undefined` in both the
 * string and null/undefined cases.
 *
 * @param v - The Payload relation value to extract from.
 * @returns The slug string, or `undefined` when the relation is not populated.
 */
const slugOf = (v: { slug?: string } | string | null | undefined): string | undefined =>
    typeof v === 'string' || !v ? undefined : v.slug;

/**
 * Extracts the `shopifyHandle` from a Payload relation field that may be a
 * bare ID string (not populated) or an object, returning `undefined` in both
 * the string and null/undefined cases.
 *
 * @param v - The Payload relation value to extract from.
 * @returns The Shopify handle string, or `undefined` when the relation is not populated.
 */
const handleOf = (v: { shopifyHandle?: string } | string | null | undefined): string | undefined =>
    typeof v === 'string' || !v ? undefined : v.shopifyHandle;

export type ResolvedLink = { href: string; openInNewTab: boolean };

/**
 * Convert a Payload LinkRef into a usable href + newTab flag. Returns
 * `null` when the link is unfilled or malformed so callers can fall through
 * to rendering the inner element bare instead of wrapping a useless anchor.
 *
 * Locale is required for internal links because the storefront routes are
 * locale-scoped — `/[locale]/<slug>/` and `/[locale]/products/<handle>/`.
 *
 * @param link - The Payload LinkRef to resolve, or `null`/`undefined` for no link.
 * @param locale - The active locale, used to prefix internal route paths.
 * @returns The resolved href and `openInNewTab` flag, or `null` when the link is invalid.
 */
export const resolveLink = (link: LinkRef | null | undefined, { locale }: { locale: Locale }): ResolvedLink | null => {
    if (!link) return null;
    const openInNewTab = Boolean(link.openInNewTab);

    switch (link.kind) {
        case 'external':
            return link.url && isSafeExternalUrl(link.url) ? { href: link.url, openInNewTab } : null;
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
            // Pre-`kind` legacy data only has `url`. Treat as external for
            // back-compat so older CMS docs don't stop linking, but still
            // gate the scheme so `javascript:` payloads can't slip through.
            return link.url && isSafeExternalUrl(link.url) ? { href: link.url, openInNewTab } : null;
    }
};
