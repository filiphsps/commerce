/**
 * Shared Vitest coverage configuration.
 *
 * Per-package `test` tasks each run standalone under turbo, so they cannot lean on the root
 * aggregation for coverage settings. This module is the single source for the exclude list
 * (keeping coverage denominators identical to the legacy single-process run) and the per-glob
 * floors, which are enforced against the MERGED report by `scripts/coverage-gate.ts`.
 */

/** Files excluded from coverage in every package. Mirrors the legacy root `coverageExclude`. */
export const coverageExclude = [
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
    '**/scripts/**',
    'scripts/**',
];

/** Per-glob coverage floors enforced against the merged report. */
export const COVERAGE_THRESHOLDS: Record<
    string,
    { lines: number; branches: number; functions: number; statements: number }
> = {
    'apps/storefront/src/**': { lines: 65, branches: 50, functions: 75, statements: 60 },
    'apps/admin/src/**': { lines: 65, branches: 45, functions: 50, statements: 65 },
};
