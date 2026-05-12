import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Docusaurus site. Spins up the dev server before
 * the suite runs, runs every test against http://localhost:3002/commerce/,
 * and reuses an already-running server when one is detected (so local
 * iteration doesn't pay the cold-start cost).
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:3002',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'pnpm run docusaurus:start',
        url: 'http://localhost:3002/commerce/',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
