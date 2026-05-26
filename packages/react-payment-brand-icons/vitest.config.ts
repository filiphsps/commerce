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
        fileParallelism: true,
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: [
            '**/*.d.ts',
            '**/*.stories.*',
            '**/dist/**/',
            '**/node_modules/**/*.*',
            '**/utils/test/**/*.*',
            '**/generated/**/*.*',
        ],
        globals: true,
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                '__tests__/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                'scripts/**',
                'src/**/index.*',
                '**/generated/**/*.*',
            ],
            thresholds: {
                lines: 85,
                functions: 85,
                branches: 80,
                statements: 85,
            },
        },
    },
});
