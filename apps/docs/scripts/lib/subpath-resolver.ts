import fs from 'node:fs';
import path from 'node:path';

export type Subpath = {
    /** Export key from package.json (e.g. '.', './api', './blocks/render'). */
    subpath: string;
    /** Absolute path to the .ts source entry. */
    sourceFile: string;
};

type ExportsValue = string | string[] | { [condition: string]: ExportsValue } | null;

/**
 * Parse `exports` from a workspace's `package.json` and return all subpaths
 * that resolve to a TypeScript source file.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @returns Array of resolved subpaths, empty when none are found.
 */
export function resolveSubpaths(workspaceRoot: string): Subpath[] {
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { exports?: ExportsValue };
    if (!pkg.exports) return [];
    const out: Subpath[] = [];
    if (typeof pkg.exports === 'string') {
        const file = resolveTs(workspaceRoot, pkg.exports);
        if (file) out.push({ subpath: '.', sourceFile: file });
        return out;
    }
    for (const [key, value] of Object.entries(pkg.exports as Record<string, ExportsValue>)) {
        const file = resolveAny(workspaceRoot, value);
        if (file) out.push({ subpath: key, sourceFile: file });
    }
    return out;
}

/**
 * Recursively unwrap array / conditional-object export values until a `.ts`/`.tsx`
 * source file is found.
 *
 * @param root - Workspace root for resolving relative paths.
 * @param value - Raw export value from package.json.
 * @returns Absolute path to the resolved source file, or `undefined` if none found.
 */
export function resolveAny(root: string, value: ExportsValue): string | undefined {
    if (typeof value === 'string') return resolveTs(root, value);
    if (Array.isArray(value)) {
        for (const v of value) {
            const r = resolveAny(root, v);
            if (r) return r;
        }
        return undefined;
    }
    if (typeof value === 'object' && value !== null) {
        for (const cond of ['types', 'source', 'import', 'default', 'require']) {
            if (cond in value) {
                const r = resolveAny(root, value[cond] ?? null);
                if (r) return r;
            }
        }
    }
    return undefined;
}

/**
 * Resolve a relative path to an absolute TypeScript source file. Returns
 * `undefined` when the path doesn't end in `.ts`/`.tsx` or doesn't exist on disk.
 *
 * @param root - Base directory for resolution.
 * @param relPath - Relative path from the workspace root.
 * @returns Absolute path if it exists, otherwise `undefined`.
 */
export function resolveTs(root: string, relPath: string): string | undefined {
    if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) return undefined;
    const abs = path.resolve(root, relPath);
    return fs.existsSync(abs) ? abs : undefined;
}

/**
 * Derive the on-disk JSON output path for a given workspace slug + subpath key.
 * `'.'` maps to `index.json`; `'./api'` maps to `api.json`.
 *
 * @param outRoot - Root directory where `.typedoc-out/` lives.
 * @param workspaceSlug - Workspace identifier (e.g. `'cms'`, `'tagtree/core'`).
 * @param subpath - Export key (e.g. `'.'`, `'./api'`).
 * @returns Absolute path to the expected JSON file.
 */
export function subpathJsonPath(outRoot: string, workspaceSlug: string, subpath: string): string {
    const subFs = subpath === '.' ? 'index' : subpath.replace(/^\.\//, '');
    return path.join(outRoot, workspaceSlug, `${subFs}.json`);
}
