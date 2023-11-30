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
                '**/*.d.*',
                '**/*.test.*',
                '**/app/**/{layout,route}.*',
                '**/app/**/*slice-simulator*',
                '**/build-config.*',
                '**/src/**/index.*',
                '**/src/**/markdoc/**/*.*',

                // TODO: Eh?
                '**/src/locales/*.*',
                '**/src/middleware.ts',
                '**/src/models/*.ts',
                '**/src/utils/prismic.ts',
                '**/src/api/shopify/cart.ts',
                '**/src/api/shopify.ts',
                '**/src/api/client.ts',
                '**/src/api/**/*product-reviews*.ts',
                '**/src/api/shop.ts',
                '**/src/app/**/route.ts*',
                '**/src/app/**/layout.ts*',
                '**/src/app/**/*favicon.png*',
                '**/src/components/**/*-provider*.tsx',
                '**/src/components/**/providers-registry.tsx',

                // TODO: Remove these once we do some work on the admin dashboard.
                '**/src/app/({admin,extra,news})/**/*.*'
            ]
        }
    }
});
