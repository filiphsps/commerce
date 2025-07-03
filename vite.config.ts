import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(__dirname),
    resolve: {
        alias: []
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
        rollupOptions: {
            external: [/^@nordcom\/commerce-/],
            treeshake: 'recommended',
            output: {
                chunkFileNames: 'chunks/[name].[hash].js',
                entryFileNames: '[name].js',
                esModule: true,
                exports: 'named',
                format: 'esm',
                hoistTransitiveImports: true,
                indent: false,
                interop: 'esModule',
                minifyInternalExports: true,
                noConflict: true,
                sourcemapExcludeSources: false,
                strict: true
            }
        }
    },
    esbuild: {
        keepNames: true,
        minifyIdentifiers: false
    },
    plugins: [
        tsConfigPaths({
            root: resolve(__dirname)
        })
    ]
});
