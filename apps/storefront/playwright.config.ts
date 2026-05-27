import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.STOREFRONT_DEV_SHOP ??= 'nordcom-demo-shop.com';
process.env.E2E_SHOP_DOMAIN ??= 'nordcom-demo-shop.com';

// Pre-seed locale cookies in the browser context so every test request
// (and any internal navigation) skips the middleware Shopify-locale call
// instead of 500-ing on the stub shop.
const LOCALE_COOKIE_DOMAIN = process.env.CI ? 'localhost' : 'storefront.localhost';
const LOCALE_COOKIES = ['localization', 'NEXT_LOCALE'].map((name) => ({
    name,
    value: 'en-US',
    domain: LOCALE_COOKIE_DOMAIN,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
}));

export default defineConfig({
    globalSetup: resolve(__dirname, './e2e/global-setup.ts'),
    globalTeardown: resolve(__dirname, './e2e/global-teardown.ts'),
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    // 60s absorbs turbopack first-compile (local `next dev --turbo`) plus
    // the middleware locale/shop chain.
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:1337',
        ignoreHTTPSErrors: true,
        storageState: { cookies: LOCALE_COOKIES, origins: [] },
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
        command: process.env.CI ? 'pnpm start --port 1337' : 'pnpm dev --port 1337',
        url: 'http://localhost:1337',
        reuseExistingServer: true,
        timeout: 240_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
