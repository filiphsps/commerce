import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: '@nordcom/commerce-docs',
        environment: 'happy-dom',
        include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'scripts/**/*.test.{mjs,ts}'],
    },
});
