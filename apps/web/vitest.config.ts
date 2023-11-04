import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: '@/prismic',
                replacement: path.resolve(__dirname, 'prismicio.ts')
            },
            {
                find: '@/i18n/dictionary',
                replacement: path.resolve(__dirname, './src/app/[locale]/dictionary.ts')
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
            include: ['src/**/*.{js,ts,jsx,tsx}'],
            exclude: ['**/*.d.ts', '**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}']
        }
    }
});
