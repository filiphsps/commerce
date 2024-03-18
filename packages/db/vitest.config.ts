import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

import base from '../../vitest.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
    base,
    defineConfig({
        root: resolve(__dirname),
        optimizeDeps: {
            force: true,
            esbuildOptions: {
                define: {
                    global: 'globalThis'
                },
                plugins: []
            }
        },
        resolve: {
            alias: [
                {
                    find: '@',
                    replacement: resolve(__dirname, './src')
                }
            ]
        },
        test: {
            typecheck: {
                tsconfig: `${__dirname}/tsconfig.test.json`
            },

            setupFiles: [`${__dirname}/vitest.setup.ts`],
            exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*', '**/utils/test/**/*.*'],

            coverage: {
                all: true,
                include: ['**/src/**/*.{ts,tsx}'],
                provider: 'v8',
                reportOnFailure: true,
                exclude: [
                    '__tests__/*.*',
                    '.vitest/*.*',

                    '**/__snapshots__/**/*.*',
                    '**/__tests__/**/*.*',
                    '**/*.d.*',
                    '**/*.test.*',
                    '**/utils/test/**/*.*',
                    '**/src/**/index.*',
                    '**/src/**/config/*.*'
                ]
            }
        }
    })
);
