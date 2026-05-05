import { configDefaults, defineProject } from 'vitest/config';

import path from 'node:path';

export default defineProject({
    optimizeDeps: {
        force: true
    },
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, './src')
            }
        ]
    },
    test: {
        bail: 1,
        environment: 'node',
        maxConcurrency: 16,
        passWithNoTests: true,

        typecheck: {
            tsconfig: './tsconfig.test.json'
        },

        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: [
            ...configDefaults.exclude,
            '**/*.d.ts',
            '**/*.stories.*',
            '**/dist/**/',
            '**/node_modules/**/*.*',
            '**/utils/test/**/*.*',
            './src/error.ts',
            './src/index.ts'
        ],

        globals: true,

        coverage: {
            all: true,
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                ...configDefaults.exclude,
                '__tests__/*.*',
                '.vitest/*.*',

                '**/__snapshots__/**/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                '**/utils/test/**/*.*',
                '**/src/**/index.*',
                '**/src/**/config/*.*',
                './src/error.ts',
                './src/index.ts'
            ]
        }
    }
});
