import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';

import { defineProject, mergeConfig } from 'vitest/config';

import base from '../../vitest.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
    base,
    defineProject({
        root: resolve(__dirname),
        plugins: [react()],
        resolve: {
            alias: [
                {
                    find: '@/i18n/dictionary',
                    replacement: resolve(__dirname, './src/utils/dictionary.ts')
                },
                {
                    find: '@/i18n',
                    replacement: resolve(__dirname, './src/locales')
                },
                {
                    find: '@/slices',
                    replacement: resolve(__dirname, './src/slices')
                },
                {
                    find: '@',
                    replacement: resolve(__dirname, './src')
                }
            ]
        },
        test: {
            browser: {
                name: 'edge',
                provider: 'playwright',
                providerOptions: {
                    enabled: true
                }
            },
            environment: 'happy-dom',
            pool: 'threads',

            typecheck: {
                tsconfig: `${__dirname}/tsconfig.test.json`
            },

            setupFiles: [`${__dirname}/__tests__/setup.ts`],

            coverage: {
                exclude: [
                    '__tests__/*.*',
                    '.vitest/*.*',

                    '**/__snapshots__/**/*.*',
                    '**/__tests__/**/*.*',
                    '**/*.d.*',
                    '**/*.test.*',
                    '**/utils/test/**/*.*',
                    '**/app/**/{layout,route}.*',
                    '**/app/**/*slice-simulator*',
                    '**/src/**/index.*',
                    '**/src/**/markdoc/**/*.*',
                    '**/src/**/markdoc/**/*.*',
                    '**/src/**/config/*.*',
                    '**/build-config.*',
                    '**/instrumentation.*',
                    '**/error.*',
                    '**/not-found.*',
                    '**/loading.*',

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
                    '**/src/app/**/*favicon.*',
                    '**/src/components/**/*-provider*.tsx',
                    '**/src/components/**/providers-registry.tsx',
                    '**/src/app/**/*-content.*',

                    // TODO: Remove these once we do some work on the admin dashboard.
                    '**/src/app/(shops)/**/*.*'
                ]
            }
        }
    })
);
