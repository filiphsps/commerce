// Placeholder — implemented in Task D5.
export type OverviewRow = {
    name: string;
    kind: string;
    fate: 'own-page' | 'inline';
    summary: string;
};

export type SubpathOverviewArgs = {
    workspaceSlug: string;
    subpath: string;
    rows: OverviewRow[];
};

/**
 * Placeholder — returns an empty string until Task D5.
 *
 * @returns Empty string.
 */
export function renderSubpathOverviewMdx(_args: SubpathOverviewArgs): string {
    return '';
}
