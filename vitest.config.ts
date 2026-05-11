import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const reporters = ['verbose'];
const extraReporters = !process.env.GITHUB_ACTIONS ? [] : ['github-actions', 'junit'];
const exclude = [
    '**/.next/**/*.*',
    '**/.turbo/**/*.*',
    '**/*.d.ts',
    '**/*.json',
    '**/coverage/**/*.*',
    '**/dist/**/*.*',
    '**/instrumentation.ts',
    '**/next.config.js',
    '**/node_modules/**/*.*',
    '**/sentry.*.config.ts',
    '**/tailwind.config.js',
    '**/vite.*.ts',
    '**/vitest.*.ts',
    'packages/db/src/**/index.ts',
    'next.config.js',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.workspace.ts',
];

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(__dirname),
    envDir: resolve(__dirname),
    optimizeDeps: {
        force: true,
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
            plugins: [],
        },
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
            junit: './junit.xml',
        },
        projects: ['{apps,packages}/*/vitest.config.ts'],

        coverage: {
            all: true,
            exclude: exclude,
            provider: 'v8',
            reporter: ['json', 'json-summary', 'text'],
            reportOnFailure: true,
            // Per-glob regression floors. Spec target is 80% storefront / 60% admin lines.
            // Current achieved levels (after Wave 2): storefront ~73% lines, admin ~67% lines.
            // The floors below act as anti-regression gates; raise toward the spec target
            // as additional tests land.
            thresholds: {
                'apps/storefront/src/**': {
                    lines: 70,
                    branches: 55,
                    functions: 80,
                    statements: 70,
                },
                'apps/admin/src/**': {
                    lines: 65,
                    branches: 45,
                    functions: 50,
                    statements: 65,
                },
            },
        },

        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
    },
});
