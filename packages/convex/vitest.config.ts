import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: '@nordcom/commerce-convex',
        environment: 'node',
        include: ['convex/**/*.test.ts'],
        passWithNoTests: true,
        reporters: ['verbose'],
    },
});
