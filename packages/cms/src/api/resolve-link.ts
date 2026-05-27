export type LocaleRef = { code: string };

/**
 * Discriminated union representing every link kind produced by the CMS
 * `linkField`. The `kind` discriminant matches the select options defined
 * in `src/fields/link.ts`.
 *
 * @example
 *   const link: LinkValue = { kind: 'page', page: { slug: 'about' } };
 */
export type LinkValue =
    | { kind: 'external'; url: string }
    | { kind: 'anchor'; url: string }
    | { kind: 'page'; page: { slug: string } | string }
    | { kind: 'article'; article: { slug: string } | string }
    | { kind: 'product'; product: { shopifyHandle: string } | string }
    | { kind: 'collection'; collectionRef: { shopifyHandle: string } | string };

const slugOf = (v: { slug: string } | string | undefined): string | undefined =>
    typeof v === 'string' ? undefined : v?.slug;

const handleOf = (v: { shopifyHandle: string } | string | undefined): string | undefined =>
    typeof v === 'string' ? undefined : v?.shopifyHandle;

/**
 * Convert a CMS {@link LinkValue} to a locale-aware URL string. Handles all
 * six link kinds: `external`, `anchor`, `page`, `article`, `product`, and
 * `collection`. Relations that haven't been populated (stored as a raw id
 * string) resolve to an empty string rather than throwing.
 *
 * @param link - The typed link value from the CMS `linkField`.
 * @param locale - Active locale; prepended to internal path segments.
 * @returns Absolute-path URL string, or `''` when the relation is unpopulated.
 *
 * @example
 *   resolveLink({ kind: 'page', page: { slug: 'about' } }, { locale: { code: 'en-US' } })
 *   // '/en-US/about/'
 */
export const resolveLink = (link: LinkValue, { locale }: { locale: LocaleRef }): string => {
    switch (link.kind) {
        case 'external':
            return link.url ?? '';
        case 'anchor':
            return link.url ? `#${link.url.replace(/^#/, '')}` : '';
        case 'page': {
            const slug = slugOf((link as Extract<LinkValue, { kind: 'page' }>).page);
            return slug ? `/${locale.code}/${slug}/` : '';
        }
        case 'article': {
            const slug = slugOf((link as Extract<LinkValue, { kind: 'article' }>).article);
            return slug ? `/${locale.code}/blog/${slug}/` : '';
        }
        case 'product': {
            const handle = handleOf((link as Extract<LinkValue, { kind: 'product' }>).product);
            return handle ? `/${locale.code}/products/${handle}/` : '';
        }
        case 'collection': {
            const handle = handleOf((link as Extract<LinkValue, { kind: 'collection' }>).collectionRef);
            return handle ? `/${locale.code}/collections/${handle}/` : '';
        }
        default:
            return '';
    }
};
