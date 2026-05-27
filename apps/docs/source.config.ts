import path from 'node:path';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkLinkSymbols } from './lib/remark-link-symbols';

// fumadocs-mdx compiles this file into apps/docs/.source/source.config.mjs, so
// `__dirname` would point at `.source/` and `path.resolve(__dirname, …)` would
// miss the real index file by one directory. Anchor on `process.cwd()` — every
// `pnpm` script in this app runs with cwd = `apps/docs/`, so this hits the
// correct path in both the source TS and the compiled MJS.
const indexPath = path.resolve(process.cwd(), 'lib/symbol-index.generated.json');

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
        // Pass the index PATH (not a snapshot) so `remarkLinkSymbols` re-reads
        // the file when its mtime changes — this lets `pnpm gen` in a running
        // dev session update symbol-link URLs without a server restart.
        remarkPlugins: [[remarkLinkSymbols, { indexPath, context: { tab: 'docs' } }]],
        remarkCodeTabOptions: { parseMdx: true },
        rehypeCodeOptions: {
            themes: {
                light: 'github-light',
                dark: 'github-dark-default',
            },
        },
    },
});
