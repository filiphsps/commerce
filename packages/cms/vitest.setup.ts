import { vi } from 'vitest';

// Tests default to a LOCAL MongoDB (mongodb://localhost:27017) to avoid hammering
// shared Atlas clusters with concurrent Payload bootstraps (which hit IX lock
// timeouts on free tiers). Set MONGODB_URI_TEST to override — e.g. when running
// tests against a managed test cluster in CI.
const localTestUri = 'mongodb://localhost:27017/test';
const testUri = process.env.MONGODB_URI_TEST ?? localTestUri;
vi.stubEnv('MONGODB_URI', testUri);
vi.stubEnv('PAYLOAD_SECRET', process.env.PAYLOAD_SECRET ?? 'test-payload-secret');
vi.stubEnv('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET ?? 'test-nextauth-secret');

vi.mock('server-only', () => ({}));
