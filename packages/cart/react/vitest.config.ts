import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, './src'),
            },
        ],
    },
    test: {
        deps: {
            optimizer: { client: { enabled: true }, ssr: { enabled: true } },
        },
        environment: 'jsdom',
        maxConcurrency: Infinity,
        passWithNoTests: true,
        fileParallelism: true,

        typecheck: {
            enabled: true,
            include: ['**/*.test-d.ts', '**/*.test-d.tsx'],
            tsconfig: './tsconfig.test.json',
        },

        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*', '**/utils/test/**/*.*'],

        globals: true,

        coverage: {
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                '__tests__/*.*',
                '.vitest/*.*',
                '**/__snapshots__/**/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                'src/**/index.*',
                'src/devtools.ts',
            ],
        },
    },
});
