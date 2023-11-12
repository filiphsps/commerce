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
                find: '@/prismic',
                replacement: path.resolve(__dirname, './prismicio.ts')
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
            include: ['**/src/**/*.{js,ts,jsx,tsx}'],
            exclude: ['**/*.d.ts', '**/*.test.{js,ts,jsx,tsx}', '**/*.test.{js,ts,jsx,tsx}']
        }
    }
});
