import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

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
                replacement: path.resolve(__dirname, './src/app/(store)/[locale]/dictionary.ts')
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
