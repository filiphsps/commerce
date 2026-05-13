export type LocaleRef = { code: string };

export type LinkValue =
    | { kind: 'external'; url: string }
    | { kind: 'anchor'; url: string }
    | { kind: 'page'; page: { slug: string } | string }
    | { kind: 'article'; article: { slug: string } | string }
    | { kind: 'product'; product: { shopifyHandle: string } | string }
    | { kind: 'collection'; collection: { shopifyHandle: string } | string };

const slugOf = (v: { slug: string } | string | undefined): string | undefined =>
    typeof v === 'string' ? undefined : v?.slug;

const handleOf = (v: { shopifyHandle: string } | string | undefined): string | undefined =>
    typeof v === 'string' ? undefined : v?.shopifyHandle;

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
            const handle = handleOf((link as Extract<LinkValue, { kind: 'collection' }>).collection);
            return handle ? `/${locale.code}/collections/${handle}/` : '';
        }
        default:
            return '';
    }
};
