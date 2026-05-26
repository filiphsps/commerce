import { vi } from 'vitest';

vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');

// `src/db.ts` does `await mongoose.connect(MONGODB_URI)` at module evaluation,
// so any test file that imports a model (directly or transitively) needs a
// running MongoDB — or a stubbed connection. CI runs without a local Mongo,
// which is why the schema-introspection tests in `src/models/*.test.ts`
// (e.g. `FeatureFlagSchema.path('key')`) blew up with `ECONNREFUSED`.
//
// Mock only the connection layer. `Schema`, `Types`, `Model`, etc. stay real,
// so schema introspection works exactly as in production. Per-file
// `vi.mock('mongoose', …)` calls (see `services/*.test.ts`) override this for
// their files, so existing query-shape tests are unaffected.
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

vi.mock('server-only', () => ({}));
