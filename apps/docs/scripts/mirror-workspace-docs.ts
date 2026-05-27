#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { discoverWorkspaces, type Workspace } from './lib/workspace-discovery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const PACKAGES_OUT = path.join(DOCS_APP, 'content/packages');
const DOCS_APPS_OUT = path.join(DOCS_APP, 'content/apps');
/** Legacy App Router generated dir — cleared each run so stale pages don't break builds. */
const LEGACY_GENERATED = path.join(DOCS_APP, 'app/docs/(generated)');

/**
 * Per-workspace exclude patterns relative to the workspace's `docs/` dir (no
 * file extension). Use `<dir>/**` to exclude everything under a directory.
 *
 * Why: customer-facing error pages under apps/landing/docs/errors/ use Markdoc
 * syntax for the customer-facing site; Fumadocs' MDX parser fails on them.
 * Phase F will surface these under a dedicated Errors tab — excluded here until
 * then.
 */
const WORKSPACE_EXCLUDES: Record<string, readonly string[]> = {
    landing: ['errors/**'],
};

/**
 * Maps a top-level package slug to its Packages-tab category subfolder.
 * Slugs not listed here are routed directly to `content/packages/<slug>/`
 * (tagtree/* workspaces nest naturally via their `tagtree/` prefix).
 */
const PACKAGE_CATEGORY: Readonly<Record<string, string>> = {
    cms: 'core',
    db: 'core',
    errors: 'core',
    'marketing-common': 'core',
    'shopify-graphql': 'shopify',
    'shopify-html': 'shopify',
    'react-payment-brand-icons': 'ui',
};

function matchGlob(pattern: string, str: string): boolean {
    // Simple `**` glob: only prefix matching is needed (`errors/**` matches
    // anything under `errors/`).
    if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3);
        return str === prefix || str.startsWith(`${prefix}/`);
    }
    return pattern === str;
}

/**
 * Returns true if the given relative path should be excluded for the given
 * workspace slug based on `WORKSPACE_EXCLUDES`.
 *
 * @param slug - Workspace slug.
 * @param relPath - Relative path from the workspace's docs directory (no extension).
 * @returns True when the path matches an exclusion pattern.
 */
function isExcluded(slug: string, relPath: string): boolean {
    const patterns = WORKSPACE_EXCLUDES[slug];
    if (!patterns) return false;
    return patterns.some((p) => matchGlob(p, relPath));
}

/**
 * Returns the absolute output path for a package workspace, inserting its
 * category prefix when one is defined in `PACKAGE_CATEGORY`.
 *
 * @param slug - Workspace slug (e.g. `'cms'` or `'tagtree/core'`).
 * @returns Absolute path under `content/packages/`.
 */
function packageOutPath(slug: string): string {
    const category = PACKAGE_CATEGORY[slug];
    if (category) return path.join(PACKAGES_OUT, category, slug);
    // tagtree/* workspaces already include the category segment in their slug
    // (e.g. 'tagtree/core' → content/packages/tagtree/core/).
    return path.join(PACKAGES_OUT, slug);
}

/**
 * Clear generated output directories so stale pages do not survive between
 * mirror runs. Preserves hand-written files at `content/packages/` root
 * (meta.json, _categories.json) by targeting only category subdirs.
 */
function sweep(): void {
    // Clear the legacy App Router generated dir so old nextra-era pages don't
    // appear in the build. This dir is no longer written by this script.
    if (fs.existsSync(LEGACY_GENERATED)) {
        fs.rmSync(LEGACY_GENERATED, { recursive: true, force: true });
    }

    if (fs.existsSync(DOCS_APPS_OUT)) {
        fs.rmSync(DOCS_APPS_OUT, { recursive: true, force: true });
    }
    fs.mkdirSync(DOCS_APPS_OUT, { recursive: true });

    // Clear generated category subdirs so stale package pages don't survive.
    const generatedCategories = new Set(Object.values(PACKAGE_CATEGORY));
    // Also clear the tagtree group, which nests naturally from slug paths.
    generatedCategories.add('tagtree');
    for (const cat of generatedCategories) {
        const dir = path.join(PACKAGES_OUT, cat);
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
}

/**
 * Copy or hardlink `src` to `dest`, creating parent directories as needed.
 * Hardlink is preferred; falls back to a full copy on any error.
 *
 * @param src - Source file path.
 * @param dest - Destination file path.
 */
function mirrorFile(src: string, dest: string): void {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
        fs.linkSync(src, dest);
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        console.warn(`[mirror] hardlink failed for ${src} -> ${dest}; copying instead (${code})`);
        fs.copyFileSync(src, dest);
    }
}

function* walkDocs(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walkDocs(full);
        else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) yield full;
    }
}

/**
 * Mirror all MDX/MD files from a workspace's `docs/` directory to the
 * appropriate content output directory.
 *
 * - Apps  → `content/apps/<slug>/`
 * - Packages → `content/packages/<category>/<slug>/` (or `content/packages/<slug>/`
 *   for workspaces without a category override, e.g. `tagtree/*`).
 *
 * @param ws - Workspace descriptor.
 * @returns Number of files mirrored.
 */
function mirrorWorkspace(ws: Workspace): number {
    let linked = 0;
    const out = ws.type === 'app' ? path.join(DOCS_APPS_OUT, ws.slug) : packageOutPath(ws.slug);

    for (const src of walkDocs(ws.docsPath)) {
        const relFromDocs = path.relative(ws.docsPath, src);
        const withoutExt = relFromDocs.replace(/\.(mdx|md)$/, '');
        if (isExcluded(ws.slug, withoutExt)) continue;
        const dest = path.join(out, `${withoutExt}.mdx`);
        mirrorFile(src, dest);
        linked++;
    }
    return linked;
}

/**
 * Write `content/apps/meta.json` listing the mirrored app workspaces so
 * Fumadocs registers them in the Docs tab sidebar.
 *
 * @param workspaces - Full workspace list (apps + packages).
 */
function emitAppsMeta(workspaces: Workspace[]): void {
    const appSlugs = workspaces.filter((w) => w.type === 'app').map((w) => w.slug);
    const meta = { title: 'Apps', pages: appSlugs };
    fs.writeFileSync(path.join(DOCS_APPS_OUT, 'meta.json'), JSON.stringify(meta, null, 4));
}

/**
 * Write `content/packages/applications/meta.json` with Fumadocs external-link
 * entries so the Packages tab sidebar cross-links to each app's Docs-tab page.
 *
 * @param workspaces - Full workspace list (apps + packages).
 */
function emitApplicationsMeta(workspaces: Workspace[]): void {
    const appSlugs = workspaces.filter((w) => w.type === 'app').map((w) => w.slug);
    if (appSlugs.length === 0) return;
    const meta = {
        title: 'Applications',
        description: 'Apps in this monorepo (cross-linked to their Docs-tab pages).',
        pages: appSlugs.map((s) => `[${capitalize(s)}](/apps/${s}/)`),
    };
    const file = path.join(PACKAGES_OUT, 'applications', 'meta.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(meta, null, 4));
}

/**
 * Write per-category `meta.json` files so Fumadocs renders each group as a
 * named, collapsible section in the Packages tab sidebar.
 *
 * Category directories (core/, shopify/, tagtree/, ui/) are cleared by
 * `sweep()` on every run, so these files must be re-emitted after mirroring.
 */
function emitCategoryMeta(): void {
    const categories: ReadonlyArray<{ dir: string; title: string }> = [
        { dir: 'core', title: 'Core' },
        { dir: 'shopify', title: 'Shopify' },
        { dir: 'tagtree', title: 'TagTree' },
        { dir: 'ui', title: 'UI' },
    ];
    for (const { dir, title } of categories) {
        const folder = path.join(PACKAGES_OUT, dir);
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(path.join(folder, 'meta.json'), JSON.stringify({ title }, null, 4));
    }
}

/**
 * Capitalizes the first character of a string.
 *
 * @param s - Input string.
 * @returns String with the first character uppercased.
 */
function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function main({ quiet = false }: { quiet?: boolean } = {}): { mirrored: number; workspaces: number } {
    sweep();
    const workspaces = discoverWorkspaces(REPO_ROOT);
    let total = 0;
    for (const ws of workspaces) {
        total += mirrorWorkspace(ws);
    }
    emitAppsMeta(workspaces);
    emitApplicationsMeta(workspaces);
    emitCategoryMeta();
    if (!quiet) {
        console.info(`[mirror-workspace-docs] mirrored ${total} pages across ${workspaces.length} workspace(s)`);
    }
    return { mirrored: total, workspaces: workspaces.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
