import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Stub `next/cache` via `resolve.alias` so Vite redirects the bare specifier
// to an in-memory no-op before Node touches it: outside a Next.js render
// context `revalidateTag` / `revalidatePath` throw
// `Invariant: static generation store missing`. The stub no-ops invalidation
// and makes `unstable_cache` an identity wrapper.
const nextCacheStub = `data:text/javascript,export const revalidateTag = () => undefined;export const revalidatePath = () => undefined;export const unstable_cache = (fn) => fn;`;

export default defineConfig({
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, './src') },
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
