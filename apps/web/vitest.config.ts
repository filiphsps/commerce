import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        force: true
    },
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
        environment: 'happy-dom',
        maxConcurrency: 16,
        passWithNoTests: true,

        /*pool: 'vmThreads',
        poolOptions: {
            vmThreads: {
                useAtomics: true
            }
        },*/

        typecheck: {
            tsconfig: './tsconfig.test.json'
        },

        setupFiles: ['./__tests__/setup.ts'],
        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*', '**/utils/test/**/*.*'],

        globals: true,
        deps: {
            web: {
                transformCss: true,
                transformAssets: true
            }
        },

        coverage: {
            all: true,
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                '__tests__/*.*',
                '.vitest/*.*',

                '**/__snapshots__/**/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                '**/app/**/{layout,route}.*',
                '**/app/**/*slice-simulator*',
                '**/src/**/index.*',
                '**/src/**/markdoc/**/*.*',
                '**/src/**/markdoc/**/*.*',
                '**/src/**/config/*.*',
                '**/build-config.*',
                '**/instrumentation.*',
                '**/not-found.*',

                // TODO: Eh?
                '**/src/locales/*.*',
                '**/src/middleware.ts',
                '**/src/middleware/admin.ts',
                '**/src/middleware/storefront.ts',
                '**/src/middleware/unknown.ts',
                '**/src/models/*.ts',
                '**/src/utils/prismic.ts',
                '**/src/utils/css-variables.tsx',
                '**/src/api/shopify/cart.ts',
                '**/src/api/shopify.ts',
                '**/src/api/client.ts',
                '**/src/api/**/*product-reviews*.ts',
                '**/src/api/shop.ts',
                '**/src/app/**/route.*',
                '**/src/app/**/layout.*',
                '**/src/app/**/*favicon.png*',
                '**/src/components/**/*-provider*.tsx',
                '**/src/components/**/providers-registry.tsx',

                // TODO: Remove these once we do some work on the admin dashboard.
                '**/src/app/({admin,extra,news})/**/*.*'
            ]
        }
    }
});
