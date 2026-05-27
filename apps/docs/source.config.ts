import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

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
        remarkCodeTabOptions: { parseMdx: true },
    },
});
