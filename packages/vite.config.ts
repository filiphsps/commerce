import { globSync } from 'glob';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLogger, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsConfigPaths from 'vite-tsconfig-paths';

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = Object.fromEntries(
    globSync('./**/src/**/*.ts*', {
        ignore: ['**/*.d.ts', '**/coverage/**', '**/dist/**', '**/node_modules/**', '**/*.test.*', '**/*.stories.*']
    }).map((file) => {
        const filenameWithoutExt = file.slice(0, file.length - extname(file).length);

        return [relative('src', filenameWithoutExt), resolve(process.cwd(), file)];
    })
);

const logger = createLogger();
logger.info(JSON.stringify({ __dirname, ...input }, null, 4));

export default defineConfig({
    root: process.cwd(),
    build: {
        copyPublicDir: false,
        emptyOutDir: true,
        minify: false,
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
                exports: 'auto',
                format: 'esm',
                globals: {},
                indent: false,
                interop: 'esModule',
                sourcemapExcludeSources: false
            }
        }
    },
    plugins: [
        tsConfigPaths(),
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
});
