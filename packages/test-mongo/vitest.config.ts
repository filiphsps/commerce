import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Stub modules via `resolve.alias` so Vite redirects bare specifiers to
// in-memory no-ops before Node touches them. `vi.mock` in `vitest.setup.ts`
// is not enough on its own: Vitest 4's SSR loader externalizes `node_modules`
// by default, so the mock factory never runs against transitive imports.
//
// - `@payloadcms/storage-s3` pulls in `@smithy/core`, whose ESM uses
//   extensionless relative imports that Node's strict resolver rejects with
//   `MODULE_NOT_FOUND`. The CMS storage plugin is only invoked when S3 env
//   vars are set, so the test runtime never calls into the stub — the alias
//   only needs to satisfy the static import in `@nordcom/commerce-cms/config`.
// - `next/cache` requires a Next.js render context; outside one it throws
//   `Invariant: static generation store missing` from `revalidateTag` /
//   `revalidatePath`. The CMS hooks call these on every write. The stub
//   no-ops invalidation and makes `unstable_cache` an identity wrapper.
const storageS3Stub = `data:text/javascript,export const s3Storage = () => (incomingConfig) => incomingConfig;`;
const nextCacheStub = `data:text/javascript,export const revalidateTag = () => undefined;export const revalidatePath = () => undefined;export const unstable_cache = (fn) => fn;`;

export default defineConfig({
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, './src') },
            { find: /^@payloadcms\/storage-s3$/, replacement: storageS3Stub },
            { find: /^next\/cache$/, replacement: nextCacheStub },
        ],
    },
    // `server-only` ships a conditional `react-server` export that points at
    // an empty no-op (`empty.js`); the default export throws on import. The
    // seed helpers pull in `@nordcom/commerce-db`'s `src/db.ts`
    // (`import 'server-only'`) for the real `ShopSchema`, so opt into the
    // `react-server` condition during SSR resolution to mirror what Next.js
    // / RSC bundles do at build time. Per Vitest 4 docs the node environment
    // uses `ssr.resolve.conditions`, not `resolve.conditions`.
    ssr: {
        resolve: {
            conditions: ['react-server', 'node', 'import', 'module', 'default'],
        },
    },
    test: {
        deps: {
            optimizer: { client: { enabled: true }, ssr: { enabled: true } },
        },
        environment: 'node',
        passWithNoTests: true,
        // MMS boots a real mongod; serialize to keep memory under control.
        fileParallelism: false,
        maxConcurrency: 1,
        setupFiles: ['vitest.setup.ts'],
        // Cold-cache binary download can take ~15s, plus replSet boot.
        testTimeout: 60_000,
        hookTimeout: 60_000,

        typecheck: {
            tsconfig: './tsconfig.test.json',
        },

        reporters: ['verbose'],
        exclude: ['**/*.d.ts', '**/*.stories.*', '**/dist/**/', '**/node_modules/**/*.*'],

        globals: true,

        coverage: {
            include: ['**/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.mjs', '**/src/index.ts'],
        },
    },
});
