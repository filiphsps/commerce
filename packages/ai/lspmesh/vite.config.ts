import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// A node CLI/library: never bundle node builtins or the runtime dependencies —
// consumers install them. Externalize both bare and `node:`-prefixed builtins.
const nodeExternals = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

// Self-contained (not extending packages/vite.config) so the shared input glob
// `./**/src/**` doesn't sweep in the integration fixture's own `src/` directory.
export default defineConfig({
    resolve: {
        alias: { '@': resolve(__dirname, 'src') },
    },
    build: {
        target: 'node20',
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                cli: resolve(__dirname, 'src/cli.ts'),
            },
            formats: ['es'],
        },
        rolldownOptions: {
            external: [
                ...nodeExternals,
                '@modelcontextprotocol/sdk',
                'vscode-jsonrpc',
                'vscode-languageserver',
                'vscode-languageserver-protocol',
                'zod',
                /^@modelcontextprotocol\/sdk\//,
                /^vscode-jsonrpc\//,
                /^vscode-languageserver\//,
                /^vscode-languageserver-protocol\//,
            ],
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name].[hash].js',
            },
        },
    },
    plugins: [
        dts({
            entryRoot: 'src',
            tsconfigPath: './tsconfig.json',
            include: ['src'],
            bundleTypes: false,
            insertTypesEntry: true,
        }),
    ],
});
