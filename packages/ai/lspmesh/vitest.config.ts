import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
    root,
    resolve: { alias: { '@': resolve(root, 'src') } },
    test: {
        globals: true,
        environment: 'node',
        // Unit tests live beside source; integration tests have their own config.
        include: ['src/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
    },
});
