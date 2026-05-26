import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const isGitHubActions = process.env.GITHUB_ACTIONS && process.env.GITHUB_ACTIONS === 'true';
const isCI = process.env.CI && process.env.CI === 'true';

const reporters = ['verbose'];
const githubReporters = isGitHubActions ? ['github-actions'] : [];
const ciReporters = isCI ? ['junit'] : [];
const exclude = [
    '**/.next/**/*.*',
    '**/.turbo/**/*.*',
    '**/*.d.ts',
    '**/*.json',
    '**/*.scss',
    '**/coverage/**/*.*',
    '**/dist/**/*.*',
    '**/instrumentation.ts',
    '**/next.config.*',
    '**/node_modules/**/*.*',
    '**/src/generated/**/*.*',
    '**/tailwind.config.js',
    '**/vite.*.ts',
    '**/vitest.*.ts',
    '{apps,packages}/**/src/**/index.*',
    'next.config.js',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.workspace.ts',
];

const coverageExclude = [...exclude, '**/scripts/**', 'scripts/**'];

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(__dirname),
    envDir: resolve(__dirname),
    test: {
        bail: undefined,
        environment: 'node',
        exclude,
        maxConcurrency: Infinity,
        // Tests within a single file run SEQUENTIALLY by default. Opt-in to
        // intra-file parallelism per-file with `describe.concurrent` or per-test
        // with `it.concurrent`. Many of our suites mutate shared state (DOM via
        // `@testing-library/react`'s `render`, hoisted `vi.fn()` mocks shared
        // across `it`s) that breaks under concurrent execution. Cross-file
        // parallelism is still on (each project's `fileParallelism: true`).
        sequence: {
            concurrent: false,
        },
        passWithNoTests: true,
        silent: false,
        reporters: [...reporters, ...githubReporters, ...ciReporters],
        outputFile: {
            junit: './junit.xml',
        },
        projects: ['{apps,packages}/**/vitest.config.ts'],

        coverage: {
            exclude: coverageExclude,
            provider: 'v8',
            reporter: ['json', 'json-summary', ...(isCI || isGitHubActions ? [] : ['text']), 'text-summary'],
            reportOnFailure: true,
            // Per-glob regression floors. Spec target is 80% storefront / 60% admin lines.
            // Current achieved levels (after Wave 2): storefront ~73% lines, admin ~67% lines.
            // The floors below act as anti-regression gates; raise toward the spec target
            // as additional tests land.
            thresholds: {
                'apps/storefront/src/**': {
                    lines: 65,
                    branches: 50,
                    functions: 75,
                    statements: 60,
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
