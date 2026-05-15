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
        bail: 1,
        deps: {
            optimizer: { client: { enabled: true }, ssr: { enabled: true } },
        },
        environment: 'node',
        maxConcurrency: 16,
        passWithNoTests: true,
        fileParallelism: false,

        typecheck: {
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
                '**/utils/test/**/*.*',
                '**/src/**/index.*',
                '**/src/**/config/*.*',
                '**/src/test-utils/**/*.*',
                '**/src/types/payload-types.ts',
            ],
        },
    },
});
