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
