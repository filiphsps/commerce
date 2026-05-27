import type { OverviewRow } from './render-subpath-mdx';

export type GalleryArgs = { workspaceSlug: string; subpath: string; rows: OverviewRow[] };

/**
 * Render a single "gallery" overview page for component-heavy subpaths
 * (react-payment-brand-icons being the canonical case). Replaces per-component
 * pages with a grid showing each component plus its JSDoc summary inline.
 *
 * @param args - Workspace slug, subpath key, and all symbol rows for the subpath.
 * @returns The full MDX file body (frontmatter included).
 */
export function renderGalleryMdx(args: GalleryArgs): string {
    const { workspaceSlug, subpath, rows } = args;
    const components = rows.filter((r) => r.kind === 'component');

    const frontmatter = [
        '---',
        `title: ${workspaceSlug}/${subpath}`,
        `description: Component gallery for ${workspaceSlug}.`,
        '---',
        '',
    ].join('\n');

    const grid = [
        '<IconGallery>',
        ...components.map((c) => `  <IconCard name="${c.name}" summary="${escapeAttr(c.summary)}" />`),
        '</IconGallery>',
    ].join('\n');

    return [
        frontmatter,
        `# ${workspaceSlug} · gallery`,
        '',
        `${components.length} components in this package.`,
        '',
        grid,
    ].join('\n');
}

/**
 * Escape double-quote characters for safe embedding inside an HTML attribute value.
 *
 * @param s - Input string.
 * @returns String with `"` replaced by `&quot;`.
 */
function escapeAttr(s: string): string {
    return s.replace(/"/g, '&quot;');
}
