import { vi } from 'vitest';

vi.stubEnv('MONGODB_URI', process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test');
vi.stubEnv('PAYLOAD_SECRET', process.env.PAYLOAD_SECRET ?? 'test-payload-secret');
vi.stubEnv('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET ?? 'test-nextauth-secret');

vi.mock('server-only', () => ({}));
