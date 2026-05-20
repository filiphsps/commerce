import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

import { STORAGE_STATE_PATH } from './e2e/fixtures/storage-state';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    globalSetup: resolve(__dirname, './e2e/fixtures/seed.ts'),
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    timeout: 30_000,
    use: {
        baseURL: process.env.CI ? 'http://localhost:3000' : 'https://admin.localhost',
        ignoreHTTPSErrors: true,
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
        url: process.env.CI ? 'http://localhost:3000' : 'https://admin.localhost',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
