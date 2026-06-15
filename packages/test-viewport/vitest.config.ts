import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // happy-dom gives `installMatchMedia` a real `window` to patch, mirroring
        // how the helper is consumed in app/component unit tests.
        environment: 'happy-dom',
        passWithNoTests: true,
        globals: true,
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/dist/**/', '**/node_modules/**/*.*'],
        coverage: {
            include: ['**/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/src/index.ts'],
        },
    },
});
