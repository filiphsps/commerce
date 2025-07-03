import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { globSync } from 'glob';
import { createLogger, defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsConfigPaths from 'vite-tsconfig-paths';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = Object.fromEntries(
    globSync('./**/src/**/*.ts*', {
        ignore: ['**/*.d.ts', '**/coverage/**', '**/dist/**', '**/node_modules/**', '**/*.test.*', '**/*.stories.*']
    }).map((file) => {
        const filenameWithoutExt = file.slice(0, file.length - extname(file).length);

        return [relative('src', filenameWithoutExt), resolve(process.cwd(), file)];
    })
);

const logger = createLogger(undefined, {
    prefix: process.cwd()?.split('/').at(-1)
});
logger.info(JSON.stringify({ __dirname, ...input }, null, 4));

export default mergeConfig(
    base,
    defineConfig({
        root: process.cwd(),
        build: {
            copyPublicDir: false,
            emptyOutDir: true,
            minify: 'esbuild',
            outDir: 'dist',
            sourcemap: true,
            target: 'esnext',
            lib: {
                entry: input,
                formats: ['es']
            },
            rollupOptions: {
                external: ['@nordcom/commerce-errors', 'server-only'],
                input: input,
                output: {
                    chunkFileNames: 'chunks/[name].[hash].js',
                    entryFileNames: '[name].js',
                    esModule: true,
                    format: 'esm',
                    globals: {},
                    interop: 'esModule',
                    hoistTransitiveImports: true,
                    sourcemapExcludeSources: false
                }
            }
        },
        plugins: [
            tsConfigPaths({
                root: process.cwd()
            }),
            dts({
                clearPureImport: false,
                copyDtsFiles: true,
                entryRoot: 'src',
                insertTypesEntry: true,
                rollupTypes: false,
                tsconfigPath: `./tsconfig.json`,
                include: ['**/src']
            })
        ]
    })
);
