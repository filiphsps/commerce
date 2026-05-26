import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Tests run against a local MongoDB (mongodb://localhost:27017) to avoid
// hammering shared Atlas clusters with concurrent Payload bootstraps (which hit
// IX lock timeouts on free tiers). CI mocks the connection layer in
// @nordcom/commerce-db (see packages/db/vitest.setup.ts) so no live Mongo is
// required.
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
vi.stubEnv('PAYLOAD_SECRET', process.env.PAYLOAD_SECRET ?? 'test-payload-secret');

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

// Auto-cleanup DOM between tests. Required because:
//   1. `@testing-library/react` no longer auto-cleans up under Vitest 4.
//   2. Several editor-ui tests call `render()` multiple times in the same file
//      and rely on each call starting from an empty document body.
// The cleanup is a no-op for `environment: 'node'` test files (no `document`).
afterEach(() => {
    if (typeof document === 'undefined') return;
    cleanup();
    document.body.innerHTML = '';
});
