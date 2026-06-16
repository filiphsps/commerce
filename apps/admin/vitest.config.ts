import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineProject({
    root: resolve(__dirname),
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: '@/auth',
                replacement: resolve(__dirname, './src/utils/auth.ts'),
            },
            {
                find: '@/i18n/dictionary',
                replacement: resolve(__dirname, './src/utils/dictionary.ts'),
            },
            {
                find: '@/i18n',
                replacement: resolve(__dirname, './src/locales'),
            },
            {
                find: '@/slices',
                replacement: resolve(__dirname, './src/slices'),
            },
            {
                find: '@/slices/navigation',
                replacement: resolve(__dirname, './src/slices/navigation'),
            },
            {
                find: '@',
                replacement: resolve(__dirname, './src'),
            },
        ],
    },
    test: {
        environment: 'happy-dom',

        typecheck: {
            tsconfig: `${__dirname}/tsconfig.test.json`,
        },

        setupFiles: [`${__dirname}/vitest.setup.ts`],
        // Playwright owns `e2e/**/*.spec.ts`; the e2e setup module's unit suite
        // (`e2e/global-setup.test.ts`) stays vitest-owned.
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*', './e2e/**/*.spec.ts'],

        globals: true,
        deps: {
            web: {
                transformCss: true,
                transformAssets: true,
            },
        },
        // `next` (16.x) ships no `exports` map, so its `next/server` subpath only
        // resolves via extension-completion — which Vite does but Node's native ESM
        // loader (used for externalized deps) does not. next-auth's `lib/env.js`
        // imports `next/server`; inline it so Vite resolves the subpath instead of
        // Node failing on the extensionless specifier.
        server: {
            deps: {
                inline: [/next-auth/],
            },
        },
    },
});
