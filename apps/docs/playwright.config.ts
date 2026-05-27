import { defineConfig, devices } from '@playwright/test';

process.env.STOREFRONT_DEV_SHOP ??= 'nordcom-demo-shop.com';
process.env.E2E_SHOP_DOMAIN ??= 'nordcom-demo-shop.com';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    // 60s absorbs turbopack first-compile (local `next dev --turbo`) plus
    // the auth-redirect chain that `/settings`, `/dashboard`, etc. trigger.
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:3002',
        ignoreHTTPSErrors: true,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        /*{
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },*/
    ],
    webServer: {
        command: 'pnpm exec serve out -l 3002',
        url: 'http://localhost:3002',
        reuseExistingServer: true,
        timeout: 240_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
