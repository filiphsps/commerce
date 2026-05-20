import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, './src'),
            },
        ],
    },
    test: {
        deps: {
            optimizer: { client: { enabled: true }, ssr: { enabled: true } },
        },
        environment: 'node',
        maxConcurrency: Infinity,
        passWithNoTests: true,
        // Files run sequentially — concurrent Payload bootstraps over-saturate
        // the local Mongo connection (10s `beforeAll` timeouts) and hammer
        // Atlas free tiers with IX-lock conflicts. Speed gains come from
        // skipping Payload boots entirely in tests that don't need it (see
        // `media.test.ts`, `_globals/globals.test.ts`).
        fileParallelism: false,
        // Within-file ordering is inherited from the root `sequence.concurrent:
        // false` (i.e. tests run one-at-a-time). The setup file's `afterEach`
        // (cleanup + `document.body.innerHTML = ''`) only buys isolation when
        // tests don't interleave.

        typecheck: {
            tsconfig: './tsconfig.test.json',
        },

        setupFiles: ['vitest.setup.ts'],
        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*', '**/utils/test/**/*.*'],

        globals: true,

        coverage: {
            include: ['**/src/**/*.{ts,tsx}'],
            exclude: [
                '__tests__/*.*',
                '.vitest/*.*',

                '**/__snapshots__/**/*.*',
                '**/__tests__/**/*.*',
                '**/*.d.*',
                '**/*.test.*',
                '**/utils/test/**/*.*',
                'src/**/index.*',
                '**/src/**/config/*.*',
                '**/src/test-utils/**/*.*',
                '**/src/types/payload-types.ts',
            ],
        },
    },
});
