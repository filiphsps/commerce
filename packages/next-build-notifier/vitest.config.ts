import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        globals: true,
        passWithNoTests: true,
        typecheck: {
            tsconfig: './tsconfig.test.json',
        },
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
