// apps/docs/scripts/validate-pagefind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const BASE_PATH = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
const DIR = path.join(DOCS_APP, `out${BASE_PATH}`, '_pagefind');

if (!fs.existsSync(DIR)) {
    console.error(`[validate-pagefind] no index at ${DIR}`);
    process.exit(1);
}
const files = fs.readdirSync(DIR);
const hasJs = files.includes('pagefind.js');
const indexDir = path.join(DIR, 'index');
const indexCount = fs.existsSync(indexDir) ? fs.readdirSync(indexDir).length : 0;

if (!hasJs || indexCount === 0) {
    console.error(`[validate-pagefind] missing pagefind.js or empty index/ (files=${indexCount})`);
    process.exit(1);
}
console.info(`[validate-pagefind] index OK (${indexCount} index file(s))`);
