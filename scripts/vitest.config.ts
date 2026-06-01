import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Standalone Vitest project for the repo-root migration scripts. These pure transform cores are not
 * part of any `apps/`/`packages/` workspace, so the root `vitest.config.ts` `projects` glob does not
 * pick them up; run them in isolation with `--config scripts/vitest.config.ts`. The tests never
 * touch Mongo — they exercise the exported pure cores only.
 */
export default defineConfig({
    root: dirname(fileURLToPath(import.meta.url)),
    test: {
        name: 'scripts',
        environment: 'node',
        include: ['**/*.test.ts'],
        passWithNoTests: false,
        reporters: ['verbose'],
    },
});
