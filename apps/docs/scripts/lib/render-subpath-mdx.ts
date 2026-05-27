import type { SymbolKindLabel } from './symbol-classify';

export type OverviewRow = {
    name: string;
    kind: SymbolKindLabel;
    fate: 'own-page' | 'inline';
    summary: string;
};

export type SubpathOverviewArgs = {
    workspaceSlug: string;
    subpath: string;
    rows: OverviewRow[];
};

/**
 * Emit the overview MDX for one subpath. Renders a "see Packages › <pkg>"
 * back-link banner at the top, then a table of every public symbol grouped
 * by kind. Symbols with `fate: 'own-page'` link to their dedicated page.
 *
 * @param args - Workspace slug, subpath key, and rows to render.
 * @returns The full MDX file body (frontmatter included).
 */
export function renderSubpathOverviewMdx(args: SubpathOverviewArgs): string {
    const { workspaceSlug, subpath, rows } = args;
    const groups = groupByKind(rows);

    const frontmatter = [
        '---',
        `title: ${workspaceSlug}/${subpath}`,
        `description: API reference for the ${subpath} subpath of @nordcom/commerce-${workspaceSlug}.`,
        '---',
        '',
    ].join('\n');

    const banner = `<ReferenceBackLink slug="${workspaceSlug}" subpath="${subpath}" />`;
    const sections = (['function', 'class', 'component', 'interface', 'type', 'variable', 'enum', 'other'] as const)
        .filter((k) => groups.has(k))
        .map((kind) => renderGroup(kind, groups.get(kind) ?? [], workspaceSlug, subpath));

    return [frontmatter, banner, '', `# ${workspaceSlug} / ${subpath}`, '', ...sections].join('\n');
}

/**
 * Group overview rows by their kind label into a Map for ordered rendering.
 *
 * @param rows - Flat list of symbol rows.
 * @returns Map from kind label to rows for that kind.
 */
function groupByKind(rows: OverviewRow[]): Map<SymbolKindLabel, OverviewRow[]> {
    const m = new Map<SymbolKindLabel, OverviewRow[]>();
    for (const r of rows) {
        const list = m.get(r.kind) ?? [];
        list.push(r);
        m.set(r.kind, list);
    }
    return m;
}

/**
 * Render one kind-group as a Markdown table section. Symbols with `fate: 'own-page'`
 * emit a relative link using the kebab-cased symbol name.
 *
 * @param kind - Kind label used for the section heading.
 * @param rows - Rows belonging to this kind.
 * @param slug - Workspace slug (unused — reserved for future cross-link logic).
 * @param subpath - Subpath key (unused — reserved for future cross-link logic).
 * @returns Markdown section string with trailing newline.
 */
function renderGroup(kind: SymbolKindLabel, rows: OverviewRow[], slug: string, subpath: string): string {
    const heading = `## ${pluralize(kind)}`;
    const tableHeader = '| Name | Description |\n|---|---|';
    const tableRows = rows.map((r) => {
        const nameCell = r.fate === 'own-page'
            ? `[\`${r.name}\`](./${kebab(r.name)})`
            : `\`${r.name}\``;
        return `| ${nameCell} | ${r.summary || '—'} |`;
    });
    return [heading, '', tableHeader, ...tableRows, ''].join('\n');
}

/**
 * Return the plural display label for a kind.
 *
 * @param kind - Symbol kind label.
 * @returns Human-readable plural heading string.
 */
function pluralize(kind: SymbolKindLabel): string {
    return ({ function: 'Functions', class: 'Classes', component: 'Components', interface: 'Interfaces', type: 'Types', variable: 'Variables', enum: 'Enums', other: 'Other' } as const)[kind];
}

/**
 * Convert a PascalCase or camelCase symbol name to kebab-case for use as a
 * relative URL path segment (e.g. `getArticle` → `get-article`).
 *
 * @param name - Symbol name.
 * @returns Kebab-cased string.
 */
function kebab(name: string): string {
    return name.replace(/[A-Z]/g, (m, i) => (i === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));
}
