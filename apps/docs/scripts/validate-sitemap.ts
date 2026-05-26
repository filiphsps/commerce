#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const SITEMAP = path.join(DOCS_APP, 'out/sitemap.xml');

if (!fs.existsSync(SITEMAP)) {
    console.error(`[validate-sitemap] no sitemap at ${SITEMAP}`);
    process.exit(1);
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);
if (urls.length === 0) {
    console.error('[validate-sitemap] sitemap has zero entries');
    process.exit(1);
}
const nonAbs = urls.filter((u) => !u.startsWith('http://') && !u.startsWith('https://'));
if (nonAbs.length > 0) {
    console.error(`[validate-sitemap] ${nonAbs.length} non-absolute URL(s):`);
    for (const u of nonAbs.slice(0, 5)) {
        console.error(`  ${u}`);
    }
    process.exit(1);
}
console.info(`[validate-sitemap] ${urls.length} absolute URLs`);
