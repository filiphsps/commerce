import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, './src'),
            },
        ],
    },
    test: {
        name: 'react-payment-brand-icons',
        bail: 1,
        deps: {
            optimizer: { client: { enabled: true }, ssr: { enabled: true } },
        },
        environment: 'jsdom',
        maxConcurrency: 16,
        passWithNoTests: true,
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*', '**/utils/test/**/*.*'],
        globals: true,
        coverage: {
            include: ['**/src/**/*.{ts,tsx}', '**/scripts/**/*.ts'],
            exclude: [
                '__tests__/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                '**/src/**/index.*',
                '**/src/generated/**/*.*',
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
