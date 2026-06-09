import '@testing-library/jest-dom/vitest';
import '@testing-library/react';

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, expect, vi } from 'vitest';

GlobalRegistrator.register();
expect.extend(matchers);

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

afterAll(() => {
    GlobalRegistrator.unregister();
});

vi.mock('server-only', () => ({}));

// The lazy ConvexHttpClient in `@nordcom/commerce-db` reads these on first use; stub them so
// suites that reach the (mocked) service seam never trip the fail-closed env guard. Per-file
// mocks/spies on the service objects provide the actual transport doubles.
vi.stubEnv('CONVEX_URL', 'https://test-deployment.convex.cloud');
vi.stubEnv('CONVEX_SERVER_SECRET', 'test-server-secret');
