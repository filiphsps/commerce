type ReferenceBackLinkProps = {
    /** Workspace slug used to build the Packages-tab URL (e.g. "cms"). */
    slug: string;
    /**
     * Subpath export key. The literal string `"index"` maps to the
     * workspace root (`"."`); all other values are rendered as-is.
     */
    subpath: string;
};

/**
 * Callout-style banner at the top of every reference subpath overview,
 * linking back to the workspace's Packages-tab narrative page. This gives
 * readers a quick path from the generated API docs to the authored guide.
 *
 * @param props - Workspace slug and subpath key.
 * @returns A styled back-link block.
 */
export function ReferenceBackLink({ slug, subpath }: ReferenceBackLinkProps) {
    const displaySubpath = subpath === 'index' ? '.' : subpath;
    const packageHref = `/packages/${slug}/`;
    return (
        <div
            style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                borderRadius: '0.5rem',
                background: 'var(--color-fd-muted, #f3f4f6)',
                fontSize: '0.875rem',
            }}
        >
            {'API reference for '}
            <code>
                @nordcom/commerce-{slug}
                {displaySubpath !== '.' ? `/${displaySubpath}` : ''}
            </code>
            {' · '}
            <a href={packageHref} style={{ textDecoration: 'underline' }}>
                ← Back to Packages › {slug}
            </a>
        </div>
    );
}
