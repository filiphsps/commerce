#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const PACKAGES_OUT = path.join(DOCS_APP, 'content/packages');

/**
 * Maps a top-level package slug to its Packages-tab category subfolder.
 * Must mirror the same constant in `mirror-workspace-docs.ts` so changelog
 * pages land alongside their mirrored docs pages.
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

type PackageEntry = { slug: string; root: string; type: 'app' | 'package' };

/**
 * Returns the absolute output directory for a package's content under
 * `content/packages/`, applying the same category prefix used by the mirror
 * script so changelog pages land next to the mirrored docs pages.
 *
 * @param slug - Workspace slug (e.g. `'cms'` or `'tagtree/core'`).
 * @returns Absolute path to the package's content directory.
 */
function packageOutPath(slug: string): string {
    const category = PACKAGE_CATEGORY[slug];
    if (category) return path.join(PACKAGES_OUT, category, slug);
    return path.join(PACKAGES_OUT, slug);
}

/**
 * Copy each package's `CHANGELOG.md` into the Fumadocs content tree as
 * `<category>/<slug>/changelog.mdx` with a generated frontmatter block
 * prepended. App workspaces are excluded — their git history is the changelog.
 * Packages without a `CHANGELOG.md` are silently skipped.
 *
 * @param options.quiet - Suppress console output when `true`.
 * @returns Count of changelog pages written.
 */
export function main({ quiet = false }: { quiet?: boolean } = {}): { linked: number } {
    let linked = 0;
    for (const pkg of discoverPackages()) {
        if (pkg.type !== 'package') continue;
        const src = path.join(pkg.root, 'CHANGELOG.md');
        if (!fs.existsSync(src)) continue;

        const dest = path.join(packageOutPath(pkg.slug), 'changelog.mdx');
        fs.mkdirSync(path.dirname(dest), { recursive: true });

        const raw = fs.readFileSync(src, 'utf8');
        // Strip HTML comments (e.g. `<!-- cspell:ignore ... -->`) which are not
        // valid MDX syntax — MDX requires `{/* */}` for inline comments.
        const body = raw.replace(/<!--[\s\S]*?-->/g, '');
        const pkgName = pkg.slug.replace('/', '-');
        const frontmatter = `---\ntitle: Changelog\ndescription: Release history for @nordcom/commerce-${pkgName}.\n---\n\n`;
        fs.writeFileSync(dest, frontmatter + body);
        linked++;
    }
    if (!quiet) console.info(`[symlink-changelogs] wrote ${linked} changelog page(s)`);
    return { linked };
}

/**
 * Discover all workspaces (apps and packages) that have a `package.json`,
 * regardless of whether they have a `docs/` directory. This broader scope
 * lets packages without narrative docs still expose their CHANGELOG.
 *
 * @returns List of discovered workspace entries.
 */
function discoverPackages(): PackageEntry[] {
    const out: PackageEntry[] = [];
    for (const parent of ['apps', 'packages'] as const) {
        const root = path.join(REPO_ROOT, parent);
        if (!fs.existsSync(root)) continue;
        walk(root, parent === 'apps' ? 'app' : 'package', [], out);
    }
    return out;
}

/**
 * Recursively walk `dir`, collecting any immediate subdirectory that contains
 * a `package.json` as a workspace entry.
 *
 * @param dir - Directory to walk.
 * @param type - Whether entries under this root are apps or packages.
 * @param segments - Path segments accumulated from the parent root.
 * @param out - Accumulator array.
 */
function walk(dir: string, type: 'app' | 'package', segments: string[], out: PackageEntry[]): void {
    const skipDirs = new Set(['node_modules', 'dist', 'build', '.turbo', '.next', 'src', 'docs']);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (fs.existsSync(path.join(full, 'package.json'))) {
            out.push({ slug: [...segments, entry.name].join('/'), root: full, type });
        } else {
            walk(full, type, [...segments, entry.name], out);
        }
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
