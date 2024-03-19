import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
