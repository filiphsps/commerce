import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { responsiveProjects } from '@nordcom/commerce-test-viewport/playwright';
import { CORE_RESPONSIVE_MATRIX } from '@nordcom/commerce-test-viewport/presets';
import { defineConfig, devices } from '@playwright/test';

import { STORAGE_STATE_PATH } from './e2e/fixtures/storage-state';

process.env.STOREFRONT_DEV_SHOP ??= 'nordcom-demo-shop.com';
process.env.E2E_SHOP_DOMAIN ??= 'nordcom-demo-shop.com';

/** Specs that fan out across the shared device matrix rather than the desktop project. */
const RESPONSIVE_SPECS = '**/*.responsive.spec.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    globalSetup: resolve(__dirname, './e2e/global-setup.ts'),
    globalTeardown: resolve(__dirname, './e2e/global-teardown.ts'),
    testDir: './e2e',
    // Spec files only: the e2e dir also holds the vitest-owned `global-setup.test.ts`
    // (Playwright's default testMatch would otherwise collect `.test.ts` too).
    testMatch: '**/*.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    // 60s absorbs turbopack first-compile (local `next dev --turbo`) plus
    // the auth-redirect chain that `/settings`, `/dashboard`, etc. trigger.
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:3000',
        ignoreHTTPSErrors: true,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            // The desktop project runs every spec EXCEPT the device-matrix ones.
            testIgnore: RESPONSIVE_SPECS,
            use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE_PATH },
        },
        // One project per shared viewport preset (folded foldable → phone →
        // tablet → desktop), each running only the responsive specs so the same
        // flow is asserted across every layout branch from one source of truth.
        ...responsiveProjects({
            presets: CORE_RESPONSIVE_MATRIX,
            baseUse: { storageState: STORAGE_STATE_PATH },
        }).map((project) => ({ ...project, testMatch: RESPONSIVE_SPECS })),
        /*{
            name: 'webkit',
            use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE_PATH  },
        },*/
    ],
    webServer: {
        command: process.env.CI ? 'pnpm start --port 3000' : 'pnpm dev --port 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 240_000,
        stdout: 'pipe',
        stderr: 'pipe',
        // Isolate the local dev server's distDir so the e2e `next dev` can run
        // concurrently with a developer's `pnpm dev` (Next's dev lock is keyed
        // by distDir). CI builds + serves the default `.next`, so leave it unset.
        ...(process.env.CI ? {} : { env: { ...process.env, E2E_DIST_DIR: '.next-e2e' } }),
    },
});
