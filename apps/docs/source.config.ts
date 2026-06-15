import path from 'node:path';
import { pageSchema } from 'fumadocs-core/source/schema';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { rehypeLinkSymbolsInCode } from './lib/rehype-link-symbols-in-code';
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
export const docs = defineDocs({
    dir: 'content',
    // fumadocs-mdx 15.0.12 tightened the default page schema to require a string
    // `title`. The generated typedoc reference pages under content/{packages,reference}
    // ship without frontmatter and rely on fumadocs' auto-title pass, which derives
    // `title` from the leading H1 — but that runs after schema validation. Relax
    // `title` back to optional so validation defers to the auto-title pass instead
    // of rejecting every generated page.
    docs: {
        schema: pageSchema.extend({
            title: pageSchema.shape.title.optional(),
        }),
    },
});

export default defineConfig({
    mdxOptions: {
        // Pass the index PATH (not a snapshot) so `remarkLinkSymbols` re-reads
        // the file when its mtime changes — this lets `pnpm gen` in a running
        // dev session update symbol-link URLs without a server restart.
        remarkPlugins: [[remarkLinkSymbols, { indexPath, context: { tab: 'docs' } }]],
        // After Shiki tokenises code blocks into hast, rewrite identifier
        // tokens that resolve through the symbol index into clickable anchors
        // so signatures, examples, definitions and any other rendered code
        // get the same per-kind colour pills as inline prose tokens.
        rehypePlugins: [[rehypeLinkSymbolsInCode, { indexPath, context: { tab: 'docs' } }]],
        remarkCodeTabOptions: { parseMdx: true },
        rehypeCodeOptions: {
            themes: {
                light: 'github-light',
                dark: 'github-dark-default',
            },
        },
    },
});
