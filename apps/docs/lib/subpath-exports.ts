import fs from 'node:fs';
import path from 'node:path';

export type SubpathExport = {
    /** Export key from package.json (e.g. '.', './api', './blocks/render'). */
    subpath: string;
    /** Absolute path to the .ts source entry. */
    sourceFile: string;
};

export function resolveSubpathExports(workspaceRoot: string): SubpathExport[] {
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];

    let pkg: { exports?: unknown };
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
        return [];
    }

    if (!pkg.exports) return [];

    const entries: SubpathExport[] = [];

    if (typeof pkg.exports === 'string') {
        const file = resolveTsEntry(workspaceRoot, pkg.exports);
        if (file) entries.push({ subpath: '.', sourceFile: file });
        return entries;
    }

    if (typeof pkg.exports !== 'object' || pkg.exports === null) return [];

    for (const [key, value] of Object.entries(pkg.exports)) {
        const file = resolveExportValue(workspaceRoot, value);
        if (file) entries.push({ subpath: key, sourceFile: file });
    }

    return entries;
}

/** Recursively unwraps array / conditional-object exports until it finds a .ts file or gives up. */
function resolveExportValue(workspaceRoot: string, value: unknown): string | undefined {
    if (typeof value === 'string') return resolveTsEntry(workspaceRoot, value);
    if (Array.isArray(value)) {
        for (const item of value) {
            const resolved = resolveExportValue(workspaceRoot, item);
            if (resolved) return resolved;
        }
        return undefined;
    }
    if (typeof value === 'object' && value !== null) {
        // Conditional exports — try common condition keys in priority order.
        const obj = value as Record<string, unknown>;
        for (const condition of ['types', 'source', 'import', 'default', 'require']) {
            if (condition in obj) {
                const resolved = resolveExportValue(workspaceRoot, obj[condition]);
                if (resolved) return resolved;
            }
        }
    }
    return undefined;
}

function resolveTsEntry(workspaceRoot: string, relPath: string): string | undefined {
    if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) return undefined;
    const abs = path.resolve(workspaceRoot, relPath);
    return fs.existsSync(abs) ? abs : undefined;
}
