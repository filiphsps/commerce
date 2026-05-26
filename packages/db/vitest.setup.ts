import { vi } from 'vitest';

vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');

// `src/db.ts` calls `mongoose.connect()` at module load. Stub the connection
// so model imports don't require a live Mongo; `Schema`/`Types` stay real via
// `importActual`. Per-file mocks in `services/*.test.ts` still override.
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
