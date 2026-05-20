import fs from 'node:fs';
import path from 'node:path';

import { DuplicateWorkspaceSlugError } from '@nordcom/commerce-errors';

export type Workspace = {
    /** URL slug, mirrors on-disk path under apps/* or packages/* (e.g. 'cms', 'tagtree/core'). */
    slug: string;
    /** 'app' if under apps/, 'package' if under packages/. */
    type: 'app' | 'package';
    /** Absolute path to the workspace root. */
    rootPath: string;
    /** Absolute path to the workspace's docs/ folder. */
    docsPath: string;
};

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', '.next', 'coverage', 'docs', 'src', 'api']);

export function discoverWorkspaces(repoRoot: string): Workspace[] {
    const workspaces: Workspace[] = [];

    function walk(dir: string, parent: 'apps' | 'packages', relSegments: string[]) {
        const isWorkspace = fs.existsSync(path.join(dir, 'docs')) && fs.existsSync(path.join(dir, 'package.json'));
        if (isWorkspace) {
            workspaces.push({
                slug: relSegments.join('/'),
                type: parent === 'apps' ? 'app' : 'package',
                rootPath: dir,
                docsPath: path.join(dir, 'docs'),
            });
            return;
        }
        if (!fs.statSync(dir).isDirectory()) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
            walk(path.join(dir, entry.name), parent, [...relSegments, entry.name]);
        }
    }

    for (const parent of ['apps', 'packages'] as const) {
        const root = path.join(repoRoot, parent);
        if (!fs.existsSync(root)) continue;
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
            walk(path.join(root, entry.name), parent, [entry.name]);
        }
    }

    assertUniqueSlugs(workspaces);

    return workspaces.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'app' ? -1 : 1;
        return a.slug.localeCompare(b.slug);
    });
}

export function assertUniqueSlugs(workspaces: { slug: string }[]): void {
    const seen = new Set<string>();
    for (const w of workspaces) {
        if (seen.has(w.slug)) {
            throw new DuplicateWorkspaceSlugError(w.slug);
        }
        seen.add(w.slug);
    }
}
