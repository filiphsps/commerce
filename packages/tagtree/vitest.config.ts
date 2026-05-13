import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    optimizeDeps: { force: true },
    resolve: {
        alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
    },
    test: {
        bail: 1,
        environment: 'node',
        maxConcurrency: 16,
        passWithNoTests: true,
        typecheck: { tsconfig: './tsconfig.test.json' },
        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: [
            ...configDefaults.exclude,
            '**/*.d.ts',
            '**/dist/**',
            '**/node_modules/**',
        ],
        globals: true,
        coverage: {
            include: ['**/src/**/*.ts'],
            exclude: [
                ...configDefaults.exclude,
                '**/__tests__/**',
                '**/*.d.*',
                '**/*.test.*',
                './src/index.ts',
                './src/contract-tests.ts',
            ],
        },
    },
});
