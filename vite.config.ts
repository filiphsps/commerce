import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(__dirname),
    resolve: {
        alias: [],
        tsconfigPaths: true,
    },
    build: {
        copyPublicDir: false,
        cssCodeSplit: false,
        cssMinify: false,
        emptyOutDir: true,
        minify: false,
        outDir: 'dist',
        sourcemap: true,
        target: 'esnext',
        rolldownOptions: {
            external: [/^@nordcom\/commerce-/],
            output: {
                chunkFileNames: 'chunks/[name].[hash].js',
                entryFileNames: '[name].js',
                esModule: true,
                exports: 'named',
                format: 'esm',
                minifyInternalExports: true,
                sourcemapExcludeSources: false,
                strict: true,
            },
        },
    },
});
