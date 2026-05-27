import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@': __dirname,
        },
    },
    test: {
        name: '@nordcom/commerce-docs',
        environment: 'happy-dom',
        include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    },
});
