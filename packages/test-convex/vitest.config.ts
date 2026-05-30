import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
    },
    test: {
        environment: 'node',
        passWithNoTests: true,
        // The Convex harness boots a backend per file; serialize to bound memory.
        fileParallelism: false,
        maxConcurrency: 1,
        // Cold-cache binary fetch plus backend boot can exceed the default 5s.
        testTimeout: 60_000,
        hookTimeout: 60_000,

        typecheck: {
            tsconfig: './tsconfig.test.json',
        },

        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*'],

        globals: true,

        coverage: {
            include: ['**/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/src/index.ts'],
        },
    },
});
