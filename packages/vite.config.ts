import { globSync } from 'glob';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLogger, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsConfigPaths from 'vite-tsconfig-paths';

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = Object.fromEntries(
    globSync('./**/src/**/*.ts*')
        .filter(
            (file) =>
                ['.test', '.stories'].every((ext) => !file.includes(ext)) &&
                ['coverage/', 'dist/'].every((path) => !file.includes(path))
        )
        .map((file) => {
            const filenameWithoutExt = file.slice(0, file.length - extname(file).length);

            return [relative('src', filenameWithoutExt), resolve(process.cwd(), file)];
        })
);

const logger = createLogger();
logger.info(JSON.stringify(input, null, 4));

export default defineConfig({
    root: resolve(__dirname),
    build: {
        copyPublicDir: false,
        emptyOutDir: true,
        minify: true,
        outDir: 'dist',
        sourcemap: true,
        target: 'esnext',
        lib: {
            entry: input,
            formats: ['es']
        },
        rollupOptions: {
            external: ['@nordcom/commerce-errors', 'server-only'],
            output: {
                chunkFileNames: 'chunks/[name].[hash].js',
                entryFileNames: '[name].js',
                esModule: true,
                exports: 'named',
                format: 'esm',
                globals: {},
                indent: false,
                interop: 'esModule',
                sourcemapExcludeSources: true,
                strict: true
            }
        }
    },
    plugins: [
        tsConfigPaths(),
        dts({
            clearPureImport: false,
            entryRoot: 'src',
            insertTypesEntry: false,
            rollupTypes: false,
            tsconfigPath: 'tsconfig.json',
            include: ['**/src']
        })
    ]
});
