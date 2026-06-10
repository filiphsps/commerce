import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Standalone Vitest project for the repo-root migration scripts. These pure transform cores are not
 * part of any `apps/`/`packages/` workspace, so the root `vitest.config.ts` `projects` glob does not
 * pick them up; run them in isolation with `--config scripts/vitest.config.ts`. The tests never
 * touch Mongo — they exercise the exported pure cores only.
 */
export default defineConfig({
    root: SCRIPTS_DIR,
    // The storefront tsconfig sets `jsx: "preserve"` (Next.js owns the transform there); when the
    // fidelity gate pulls the live renderer into this project, Vite's oxc transform must compile
    // that JSX itself with the automatic runtime instead of passing it through.
    oxc: {
        jsx: { runtime: 'automatic', importSource: 'react' },
    },
    resolve: {
        // The rich-text fidelity gate (CMSRICH-03) loads the LIVE storefront renderer, whose
        // `@/components/link` import must resolve to the gate's plain-anchor stub — the same
        // substitution the storefront golden suite makes with `vi.mock`, and the environment the
        // pre-rewrite DOM was pinned in. The broad `@/` alias covers the renderer's remaining
        // (type-only) storefront imports. Mirrors the `paths` mapping in `scripts/tsconfig.json`
        // that serves direct `tsx` runs of the gate.
        alias: [
            {
                find: /^@\/components\/link$/,
                replacement: resolve(SCRIPTS_DIR, './richtext-fidelity-link-stub.ts'),
            },
            {
                find: '@',
                replacement: resolve(SCRIPTS_DIR, '../apps/storefront/src'),
            },
        ],
    },
    test: {
        name: 'scripts',
        environment: 'node',
        include: ['**/*.test.ts'],
        passWithNoTests: false,
        reporters: ['verbose'],
    },
});
