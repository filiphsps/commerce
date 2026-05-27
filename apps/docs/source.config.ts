import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkLinkSymbols } from './lib/remark-link-symbols';
import type { SymbolIndex } from './lib/jsdoc-link-resolver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, 'lib/symbol-index.generated.json');

/** Load the symbol index if it exists; empty object on first run before `pnpm gen`. */
const symbolIndex: SymbolIndex = fs.existsSync(indexPath)
    ? (JSON.parse(fs.readFileSync(indexPath, 'utf8')) as SymbolIndex)
    : {};

/**
 * Fumadocs-MDX collection definitions. Each call carves out a directory under
 * `content/` and exposes it via the loader in `lib/source.ts`. Keep the four
 * collections in sync with the root folders documented in spec §IA.
 */
export const docs = defineDocs({ dir: 'content/docs' });
export const packages = defineDocs({ dir: 'content/packages' });
export const reference = defineDocs({ dir: 'content/reference' });
export const errors = defineDocs({ dir: 'content/errors' });

export default defineConfig({
    mdxOptions: {
        remarkPlugins: [[remarkLinkSymbols, { index: symbolIndex, context: { tab: 'docs' } }]],
        remarkCodeTabOptions: { parseMdx: true },
    },
});
