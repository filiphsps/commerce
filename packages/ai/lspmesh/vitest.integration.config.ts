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
        include: ['tests/integration/**/*.integration.test.ts'],
        testTimeout: 180_000,
        hookTimeout: 180_000,
        pool: 'forks',
        fileParallelism: false,
    },
});
