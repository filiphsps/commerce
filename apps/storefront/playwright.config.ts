import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Skip middleware's `Shop.findAll()` lookup when resolving the dev-host
// fallback so the webServer doesn't depend on mongo being reachable before
// its first request lands.
process.env.STOREFRONT_DEV_SHOP ??= 'nordcom-demo-shop.com';

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
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    // 60s absorbs turbopack first-compile (local `next dev --turbo`) plus
    // the middleware locale/shop chain.
    timeout: 60_000,
    use: {
        // `*.storefront.localhost` triggers middleware's dev-shop fallback,
        // resolves to the seeded demo shop, and avoids the portless https
        // dependency. CI keeps bare `localhost:1337` since `*.localhost`
        // isn't guaranteed to resolve on every CI image.
        baseURL: process.env.CI ? 'http://localhost:1337' : 'http://storefront.localhost:1337',
        storageState: { cookies: LOCALE_COOKIES, origins: [] },
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: process.env.CI ? 'pnpm start --port 1337' : 'PORT=1337 pnpm dev',
        // Waiting on the port rather than a URL avoids tripping over the
        // middleware Shopify-locale call that an HTTP probe to `/` would
        // trigger before the test cookies are in place.
        port: 1337,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
