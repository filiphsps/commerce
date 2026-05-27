#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { IndexEntry, SymbolIndex } from '../lib/jsdoc-link-resolver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const TYPEDOC_OUT = path.join(DOCS_APP, '.typedoc-out');
const CONTENT = path.join(DOCS_APP, 'content');
const OUT_FILE = path.join(DOCS_APP, 'lib/symbol-index.generated.json');

/** TypeDoc kind flag to our IndexEntry kind. Subset of the flags TypeDoc emits. */
const KIND_MAP: Record<number, IndexEntry['kind']> = {
    64: 'function',
    128: 'class',
    256: 'interface',
    32: 'variable',
    2097152: 'type',
    8: 'enum',
};

/** Subfolders of `content/` that aren't Docs-tab concept pages — they're their own tabs. */
const NON_DOCS_DIRS = new Set(['packages', 'reference', 'errors', 'apps']);

/**
 * Build the global symbol index. Combines:
 * - Reference symbols from TypeDoc JSON output under `.typedoc-out/`
 * - Authored Packages MDX page slugs from `content/packages/`
 * - Docs concept slugs from `content/` (excluding tab subfolders)
 * - Error codes from `content/errors/`
 *
 * URLs are produced WITHOUT a leading `/docs/` prefix. The runtime
 * `NEXT_PUBLIC_DOCS_BASE_PATH` is applied by Next at routing time.
 *
 * @param options - Optional quiet flag to suppress console output.
 * @returns Count of indexed entries across all sources.
 */
export function main({ quiet = false }: { quiet?: boolean } = {}): { entries: number } {
    const index: SymbolIndex = {};

    // 1. Reference symbols from TypeDoc JSON
    for (const w of walkDir(TYPEDOC_OUT)) {
        if (!w.endsWith('.json') || w.endsWith('throw-sites.json')) continue;
        let project: { children?: Array<{ name: string; kind: number }> };
        try {
            project = JSON.parse(fs.readFileSync(w, 'utf8')) as typeof project;
        } catch {
            continue;
        }
        const rel = path.relative(TYPEDOC_OUT, w).replace(/\.json$/, '');
        const [pkg, ...rest] = rel.split('/');
        const subpath = rest.join('/') || 'index';
        for (const child of project.children ?? []) {
            const entry: IndexEntry = {
                url: `/reference/${pkg}/${subpath === 'index' ? '' : `${subpath}/`}${kebab(child.name)}/`,
                kind: KIND_MAP[child.kind] ?? 'other',
                tab: 'reference',
                pkg,
                subpath,
            };
            const bucket = index[child.name] ?? [];
            index[child.name] = bucket;
            bucket.push(entry);
        }
    }

    // 2. Packages MDX pages
    for (const f of walkDir(path.join(CONTENT, 'packages'))) {
        if (!f.endsWith('.mdx')) continue;
        const rel = path.relative(path.join(CONTENT, 'packages'), f).replace(/\.mdx$/, '');
        const slug = rel.replace(/\//g, '.');
        index[slug] = (index[slug] ?? []).concat({
            url: `/packages/${rel}/`,
            kind: 'page',
            tab: 'packages',
        });
    }

    // 3. Docs concept pages — content/ minus the tab subfolders.
    for (const f of walkDir(CONTENT)) {
        if (!f.endsWith('.mdx')) continue;
        const rel = path.relative(CONTENT, f).replace(/\.mdx$/, '');
        const topSegment = rel.split('/')[0];
        if (topSegment && NON_DOCS_DIRS.has(topSegment)) continue;
        const slug = rel.replace(/\//g, '.');
        index[slug] = (index[slug] ?? []).concat({
            url: `/${rel}/`,
            kind: 'page',
            tab: 'docs',
        });
    }

    // 4. Error codes
    for (const f of walkDir(path.join(CONTENT, 'errors'))) {
        if (!f.endsWith('.mdx')) continue;
        const code = path.basename(f, '.mdx').toUpperCase().replace(/-/g, '_');
        index[code] = (index[code] ?? []).concat({
            url: `/errors/${path.basename(f, '.mdx')}/`,
            kind: 'error',
            tab: 'errors',
        });
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(index));
    const total = Object.values(index).reduce((sum, list) => sum + list.length, 0);
    if (!quiet) console.info(`[build-symbol-index] indexed ${total} entries`);
    return { entries: total };
}

/**
 * Recursively yield all file paths under a directory. Silently skips
 * directories that do not exist.
 *
 * @param dir - Absolute path to traverse.
 * @returns Generator of absolute file paths.
 */
function* walkDir(dir: string): Generator<string> {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) yield* walkDir(full);
        else if (e.isFile()) yield full;
    }
}

/**
 * Convert a PascalCase or camelCase name to kebab-case for use in URLs.
 *
 * @param name - Symbol name from TypeDoc.
 * @returns Kebab-cased string.
 */
function kebab(name: string): string {
    return name.replace(/[A-Z]/g, (m, i: number) => (i === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
