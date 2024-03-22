import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineProject } from 'vitest/config';

export default defineProject({
    plugins: [react()],
    optimizeDeps: {
        force: true
    },
    resolve: {
        alias: [
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

        typecheck: {
            tsconfig: './tsconfig.test.json'
        },

        setupFiles: [`${__dirname}/vitest.setup.ts`],
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
                '**/utils/test/**/*.*',
                '**/app/**/{layout,route}.*',
                '**/src/**/index.*',
                '**/src/**/config/*.*',
                '**/build-config.*',
                '**/instrumentation.*',
                '**/error.*',
                '**/not-found.*',
                '**/loading.*',

                // TODO: remove the following.
                '**/src/**/*.*'
            ]
        }
    }
});
