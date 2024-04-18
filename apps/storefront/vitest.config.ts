import { defineProject } from 'vitest/config';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineProject({
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
        environment: 'happy-dom',

        typecheck: {
            tsconfig: `${__dirname}/tsconfig.test.json`
        },

        setupFiles: [`${__dirname}/vitest.setup.ts`],

        globals: true,
        deps: {
            web: {
                transformCss: true,
                transformAssets: true
            }
        }
    }
});