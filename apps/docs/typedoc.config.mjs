// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

/**
 * Auto-discover every `packages/<name>/src/index.ts` and emit a TypeDoc
 * entry point for it. Adding a new package = no edits here.
 */
function discoverPackageEntries() {
    const packagesDir = path.join(REPO_ROOT, 'packages');
    if (!fs.existsSync(packagesDir)) return [];

    return fs
        .readdirSync(packagesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(packagesDir, d.name, 'src', 'index.ts'))
        .filter((f) => fs.existsSync(f))
        .map((f) => path.relative(__dirname, f))
        .sort();
}

// Note: typedoc-plugin-markdown adds options (useCodeBlocks, expandObjects, …)
// that aren't part of TypeDoc's core type definitions, so the type assertion
// here is intentionally loose.
/** @type {Record<string, unknown>} */
const config = {
    tsconfig: './tsconfig.typedoc.json',
    entryPointStrategy: 'resolve',
    entryPoints: discoverPackageEntries(),
    plugin: ['typedoc-plugin-markdown', 'typedoc-plugin-frontmatter'],
    out: './api',
    readme: 'none',
    githubPages: false,
    excludeExternals: true,
    excludePrivate: true,
    excludeInternal: true,
    useCodeBlocks: true,
    expandObjects: true,
    hideBreadcrumbs: true,
    hidePageHeader: true,
    skipErrorChecking: true,
};

export default config;
