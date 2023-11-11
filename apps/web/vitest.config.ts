import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: '@/i18n/dictionary',
                replacement: path.resolve(__dirname, './src/app/[locale]/dictionary.ts')
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
        globals: true,
        environment: 'jsdom',

        setupFiles: ['./__tests__/setup.ts'],

        useAtomics: true,

        coverage: {
            all: true,
            include: ['**/src/**/*.{js,ts,jsx,tsx}'],
            exclude: ['**/*.d.ts', '**/*.test.{js,ts,jsx,tsx}', '**/*.test.{js,ts,jsx,tsx}']
        }
    }
});
