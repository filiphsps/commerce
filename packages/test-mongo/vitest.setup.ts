import { vi } from 'vitest';

// Pin the mongod version for the test suite so we use the same binary CI does.
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION ?? '8.0.4';

// `@nordcom/commerce-db`'s `src/db.ts` starts with `import 'server-only'` and
// does a top-level `await mongoose.connect(process.env.MONGODB_URI, ...)`.
// Mirror the pattern from `packages/db/vitest.setup.ts`: stub server-only and
// mock `mongoose.connect` so model files can be imported. `Schema`, `Types`,
// `createConnection`, and everything else stay real via `importActual` so the
// seed helpers can talk to the in-process MMS instance.
vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:0/placeholder');
vi.mock('server-only', () => ({}));
vi.mock('mongoose', async () => {
    const actual = (await vi.importActual('mongoose')) as typeof import('mongoose');
    const mockConnection = {
        models: new Proxy({}, { get: () => undefined }),
        model: vi.fn().mockReturnValue({}),
        set: vi.fn(),
    };
    const mockConnect = vi.fn().mockResolvedValue(mockConnection);
    return {
        ...actual,
        connect: mockConnect,
        default: { ...actual, connect: mockConnect },
    };
});

// `@nordcom/commerce-cms/config` statically imports `@payloadcms/storage-s3`,
// which drags in `@aws-sdk/client-s3` → `@smithy/core`. The latter's
// `dist-es/submodules/protocols/index.js` uses extensionless relative imports
// that Node's strict ESM resolver rejects with `MODULE_NOT_FOUND`.
//
// `vi.mock` alone is not enough — Vitest 4's SSR loader resolves the package's
// transitive tree at scan time, before the mock has a chance to substitute
// the entry. The real interception happens via a `resolve.alias` in
// `vitest.config.ts` that redirects the bare specifier to a `data:` URL
// no-op factory. This `vi.mock` is kept as defense-in-depth in case the
// alias is bypassed by any code path that does a runtime `import('…')`.
vi.mock('@payloadcms/storage-s3', () => ({
    s3Storage: () => (incomingConfig: unknown) => incomingConfig,
}));

// Collection `afterChange` / `afterDelete` hooks call `revalidateTag` (via
// `@tagtree/next`'s `nextAdapter`) and the CMS editor flow calls
// `revalidatePath`. `next/cache` requires a Next.js render context; outside
// one it throws `Invariant: static generation store missing`. Stub the
// handful of exports the codebase actually reaches for:
//   - `revalidateTag`, `revalidatePath`: no-op
//   - `unstable_cache`: identity wrapper so wrapped reads still execute
vi.mock('next/cache', () => ({
    revalidateTag: () => undefined,
    revalidatePath: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
}));
