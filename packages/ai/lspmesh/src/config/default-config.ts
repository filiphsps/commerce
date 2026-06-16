import type { BackendConfig, LspMeshConfig } from './types.js';

/** TypeScript/JavaScript extension → languageId map, shared by ts and tailwind. */
const TS_EXT: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.mts': 'typescript',
    '.cts': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
};

const BACKENDS: BackendConfig[] = [
    {
        name: 'typescript',
        command: 'npx',
        args: ['-y', 'typescript-language-server@4.4.1', '--stdio'],
        extensionToLanguage: { ...TS_EXT },
    },
    {
        name: 'tailwindcss',
        command: 'npx',
        args: ['-y', '@tailwindcss/language-server@0.14.29', '--stdio'],
        extensionToLanguage: {
            '.css': 'css',
            '.scss': 'scss',
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.jsx': 'javascriptreact',
            '.html': 'html',
        },
    },
    {
        name: 'biome',
        command: 'npx',
        args: ['-y', '@biomejs/biome@2.5.0', 'lsp-proxy'],
        extensionToLanguage: {
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.json': 'json',
            '.jsonc': 'jsonc',
        },
    },
];

/**
 * Built-in default used when no `lspmesh.json` is found. Backends launch via
 * `npx -y` with pinned versions — matching how the commerce-plugins LSP plugins
 * launched them — so a fresh install needs no global binaries.
 */
export const DEFAULT_CONFIG: Omit<LspMeshConfig, 'root'> = {
    backends: BACKENDS,
};
