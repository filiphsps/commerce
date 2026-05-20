import { type PageMapEntry, pageMap } from './page-map.generated';

export type { PageMapEntry };

export function getWorkspacesByType(): { apps: PageMapEntry[]; packages: PageMapEntry[] } {
    const apps: PageMapEntry[] = [];
    const packages: PageMapEntry[] = [];
    for (const entry of pageMap) {
        if (entry.type === 'app') apps.push(entry);
        else packages.push(entry);
    }
    return { apps, packages };
}

export function findWorkspace(slug: string): PageMapEntry | undefined {
    return pageMap.find((e) => e.slug === slug);
}

/** Returns siblings of the given workspace within its parent group. */
export function findSiblings(slug: string): PageMapEntry[] {
    const entry = findWorkspace(slug);
    if (!entry) return [];
    return pageMap.filter((e) => e.type === entry.type && e.slug !== slug);
}
