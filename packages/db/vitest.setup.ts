import { vi } from 'vitest';

// The lazy ConvexHttpClient in `src/db.ts` reads these on first use; stub them so service tests
// can exercise the (mocked) transport without a real deployment. Per-file mocks of
// `convex/browser` in `services/*.test.ts` provide the actual transport double.
vi.stubEnv('CONVEX_URL', 'https://test-deployment.convex.cloud');
vi.stubEnv('CONVEX_SERVER_SECRET', 'test-server-secret');

vi.mock('server-only', () => ({}));
