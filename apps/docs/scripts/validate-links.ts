#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const BASE_PATH = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
const OUT_ROOT = path.join(DOCS_APP, 'out');

if (!fs.existsSync(OUT_ROOT)) {
    console.error(`[validate-links] no build output at ${OUT_ROOT}. Run \`pnpm build\` first.`);
    process.exit(1);
}

/**
 * URL prefixes owned by the docs site. Only links whose href starts with one
 * of these values are validated — any other absolute path belongs to a
 * different app and should not be checked against the docs `out/` tree.
 *
 * The plain `/docs/` entry covers concept pages, get-started, and operations.
 * The three longer prefixes cover packages, API reference, and error codes.
 */
const KNOWN_PREFIXES = ['/docs/packages/', '/docs/reference/', '/docs/errors/', '/docs/'];

type BrokenLink = {
    from: string;
    href: string;
    target: string;
};

const broken: BrokenLink[] = [];
const seen = new Set<string>();

/**
 * Recursively yield every `.html` file path under a directory.
 *
 * @param dir - Absolute directory to traverse.
 * @returns Generator of absolute file paths.
 */
function* walkHtml(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walkHtml(full);
        else if (entry.isFile() && entry.name.endsWith('.html')) yield full;
    }
}

/**
 * Resolve an href from a source HTML file to the expected on-disk path under
 * `OUT_ROOT`. Returns `null` for any href that should not be validated
 * (external, fragment-only, mailto:, or belonging to a different app).
 *
 * @param href - Raw href attribute value from an anchor element.
 * @param fromFile - Absolute path of the HTML file containing the anchor.
 * @returns Absolute path to the expected target file, or null.
 */
function resolveHref(href: string, fromFile: string): string | null {
    if (href.startsWith('http://') || href.startsWith('https://')) return null;
    if (href.startsWith('#') || href.startsWith('mailto:')) return null;
    let target = href.split('#')[0]?.split('?')[0] ?? '';
    if (!target) return null;
    if (BASE_PATH && target.startsWith(BASE_PATH)) {
        target = target.slice(BASE_PATH.length);
    }
    if (target.startsWith('/')) {
        // Only validate links that belong to the docs site.
        if (!KNOWN_PREFIXES.some((p) => target.startsWith(p))) return null;
        target = path.join(OUT_ROOT, target);
    } else {
        target = path.resolve(path.dirname(fromFile), target);
    }
    if (target.endsWith('/')) return path.join(target, 'index.html');
    if (fs.existsSync(target)) return target;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        return path.join(target, 'index.html');
    }
    if (!path.extname(target)) return `${target}.html`;
    return target;
}

for (const file of walkHtml(OUT_ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    const matches = html.matchAll(/<a\s+[^>]*href="([^"]+)"/g);
    for (const m of matches) {
        const href = m[1];
        if (!href) continue;
        const resolved = resolveHref(href, file);
        if (!resolved) continue;
        if (seen.has(resolved)) continue;
        seen.add(resolved);
        if (!fs.existsSync(resolved)) {
            broken.push({
                from: path.relative(OUT_ROOT, file),
                href,
                target: path.relative(OUT_ROOT, resolved),
            });
        }
    }
}

if (broken.length === 0) {
    console.info('[validate-links] all internal links resolve');
    process.exit(0);
}

const byFile = new Map<string, BrokenLink[]>();
for (const b of broken) {
    if (!byFile.has(b.from)) byFile.set(b.from, []);
    byFile.get(b.from)?.push(b);
}

for (const [from, items] of byFile) {
    console.error(`\n${from}:`);
    for (const i of items) {
        console.error(`  ${i.href} → ${i.target} (missing)`);
    }
}
console.error(`\n[validate-links] ${broken.length} broken link(s) across ${byFile.size} file(s)`);
process.exit(1);
