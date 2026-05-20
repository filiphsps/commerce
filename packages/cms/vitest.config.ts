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
        environment: 'happy-dom',
        maxConcurrency: Infinity,
        passWithNoTests: true,
        // File parallelism is on: only three files boot Payload (the multi-tenant
        // suites + `boot-test-payload.test.ts`), so concurrent Mongo connections
        // stay below the contention threshold that caused 10s `beforeAll`
        // timeouts when every collection test was booting Payload too.
        fileParallelism: true,
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
                'src/**/index.*',
                '**/src/**/config/*.*',
                '**/src/test-utils/**/*.*',
                '**/src/types/payload-types.ts',
            ],
        },
    },
});
