import { vi } from 'vitest';

vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');

vi.mock('server-only', () => ({}));
