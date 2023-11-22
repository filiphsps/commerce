import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: '@/i18n/dictionary',
                replacement: path.resolve(__dirname, './src/utils/dictionary.ts')
            },
            {
                find: '@/i18n',
                replacement: path.resolve(__dirname, './src/locales')
            },
            {
                find: '@/slices',
                replacement: path.resolve(__dirname, './src/slices')
            },
            {
                find: '@',
                replacement: path.resolve(__dirname, './src')
            }
        ]
    },
    test: {
        bail: 1,
        environment: 'jsdom',
        globals: true,
        maxConcurrency: 16,
        passWithNoTests: true,
        useAtomics: true,

        setupFiles: ['./__tests__/setup.ts'],
        reporters: ['verbose'],

        coverage: {
            all: true,
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                '**/__snapshots__/**/*.*',
                '**/*.d.ts',
                '**/*.test.{js,ts,jsx,tsx}',
                '**/*.test.{js,ts,jsx,tsx}',
                '**/app/**/{layout}.tsx',
                '**/app/api/{draft,exit-preview,preview}/route.{ts,tsx}',
                '**/app/slice-simulator/*.{ts,tsx}',
                '**/build-config.ts',
                '**/src/**/index.{ts,tsx}',
                '**/src/locales/*.*',
                '**/src/middleware.ts',
                '**/src/models/*.ts',
                '**/src/utils/prismic.ts',
                '**/src/components/**/*-provider*.tsx'
            ]
        }
    }
});
