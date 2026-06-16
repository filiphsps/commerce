import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import base from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// A node CLI/library: never bundle node builtins or the runtime dependencies —
// consumers install them. Externalize both bare and `node:`-prefixed builtins.
const nodeExternals = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default mergeConfig(
    base,
    defineConfig({
        resolve: {
            alias: { '@': resolve(__dirname, 'src') },
        },
        build: {
            target: 'node20',
            rolldownOptions: {
                external: [
                    ...nodeExternals,
                    '@modelcontextprotocol/sdk',
                    'vscode-jsonrpc',
                    'vscode-languageserver',
                    'vscode-languageserver-protocol',
                    'zod',
                    // Subpath imports of the externals must be externalized too.
                    /^@modelcontextprotocol\/sdk\//,
                    /^vscode-jsonrpc\//,
                    /^vscode-languageserver\//,
                    /^vscode-languageserver-protocol\//,
                ],
            },
        },
    }),
);
