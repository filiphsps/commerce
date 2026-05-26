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

type BrokenLink = {
    from: string;
    href: string;
    target: string;
};

const broken: BrokenLink[] = [];
const seen = new Set<string>();

function* walkHtml(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walkHtml(full);
        else if (entry.isFile() && entry.name.endsWith('.html')) yield full;
    }
}

function resolveHref(href: string, fromFile: string): string | null {
    if (href.startsWith('http://') || href.startsWith('https://')) return null;
    if (href.startsWith('#') || href.startsWith('mailto:')) return null;
    let target = href.split('#')[0]?.split('?')[0] ?? '';
    if (!target) return null;
    if (BASE_PATH && target.startsWith(BASE_PATH)) {
        target = target.slice(BASE_PATH.length);
    }
    if (target.startsWith('/')) {
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
        const target = resolveHref(href, file);
        if (!target) continue;
        if (seen.has(target)) continue;
        seen.add(target);
        if (!fs.existsSync(target)) {
            broken.push({
                from: path.relative(OUT_ROOT, file),
                href,
                target: path.relative(OUT_ROOT, target),
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
