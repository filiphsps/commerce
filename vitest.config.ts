import { defineConfig } from 'vitest/config';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const reporters = ['verbose'];
const extraReporters = !process.env.GITHUB_ACTIONS ? [] : ['github-actions', 'junit'];
const exclude = [
    '**/.next/**/*.*',
    '**/.turbo/**/*.*',
    '**/*.d.ts',
    '**/*.json',
    '**/coverage/**/*.*',
    '**/dist/**/*.*',
    '**/node_modules/**/*.*',
    '**/vite.*.ts',
    '**/vitest.*.ts',
    'next.config.js',
    'vitest.workspace.ts'
];

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(__dirname),
    optimizeDeps: {
        force: true,
        esbuildOptions: {
            define: {
                global: 'globalThis'
            },
            plugins: []
        }
    },
    test: {
        bail: 1,
        environment: 'node',
        exclude,
        maxConcurrency: 16,
        passWithNoTests: true,
        silent: false,
        reporters: [...reporters, ...extraReporters],
        outputFile: {
            junit: './junit.xml'
        },

        coverage: {
            all: true,
            exclude: exclude,
            provider: 'v8',
            reporter: ['json', 'json-summary', 'text'],
            reportOnFailure: true
        },

        typecheck: {
            tsconfig: './tsconfig.test.json'
        }
    }
});
