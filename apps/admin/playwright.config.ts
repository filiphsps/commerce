import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

import { STORAGE_STATE_PATH } from './e2e/fixtures/storage-state';

// Spec files read these at module load (before globalSetup runs) to build
// `/${DOMAIN}/...` URLs. Pin them to the canonical seeded shop here so the
// defaults don't point at a tenant that doesn't exist in the test mongo.
process.env.ADMIN_E2E_SHOP_DOMAIN ??= 'nordcom-demo-shop.com';
process.env.E2E_SHOP_DOMAIN ??= 'nordcom-demo-shop.com';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    globalSetup: resolve(__dirname, './e2e/global-setup.ts'),
    globalTeardown: resolve(__dirname, './e2e/global-teardown.ts'),
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    // 60s absorbs turbopack first-compile (local `next dev --turbo`) plus
    // the auth-redirect chain that `/settings`, `/dashboard`, etc. trigger.
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE_PATH },
        },
    ],
    webServer: {
        command: process.env.CI ? 'pnpm start --port 3000' : 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
