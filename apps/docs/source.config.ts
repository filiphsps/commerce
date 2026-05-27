import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import type { SymbolIndex } from './lib/jsdoc-link-resolver';
import { remarkLinkSymbols } from './lib/remark-link-symbols';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, 'lib/symbol-index.generated.json');

/** Load the symbol index if it exists; empty object on first run before `pnpm gen`. */
const symbolIndex: SymbolIndex = fs.existsSync(indexPath)
    ? (JSON.parse(fs.readFileSync(indexPath, 'utf8')) as SymbolIndex)
    : {};

/**
 * Single Fumadocs collection rooted at `content/`. Per the spec's IA, the docs
 * site has four sidebar tabs (Docs / Packages / Reference / Errors) configured
 * as Fumadocs "root folders" (`meta.json { root: true }`). The Docs tab is the
 * unprefixed default so its pages live directly under `content/`; the other
 * three tabs each have a subfolder.
 */
export const docs = defineDocs({ dir: 'content' });

export default defineConfig({
    mdxOptions: {
        remarkPlugins: [[remarkLinkSymbols, { index: symbolIndex, context: { tab: 'docs' } }]],
        remarkCodeTabOptions: { parseMdx: true },
    },
});
