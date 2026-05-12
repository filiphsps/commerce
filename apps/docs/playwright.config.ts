import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Docusaurus site.
 *
 * Env knobs:
 *   DOCS_BASE_URL       — server URL (default http://localhost:3002, the dev
 *                         server port). Set to http://localhost:3003 to point
 *                         at the production `docusaurus serve` port.
 *   DOCS_SERVE_COMMAND  — overrides the webServer command. Used in CI to run
 *                         the prebuilt site via `docusaurus serve` instead of
 *                         spinning up the dev server.
 *   DOCS_REUSE_SERVER=1 — skip the webServer launch entirely. Useful when the
 *                         dev-loop wrapper is already running locally.
 */
const BASE_URL = process.env.DOCS_BASE_URL ?? 'http://localhost:3002';
const SERVE_COMMAND = process.env.DOCS_SERVE_COMMAND ?? 'pnpm run docusaurus:start';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Safari's runtime ("Can't find variable: require") historically broke
        // first on this site — keep webkit in the matrix so a regression to
        // bundling settings shows up in CI rather than via a user report.
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],
    webServer: process.env.DOCS_REUSE_SERVER
        ? undefined
        : {
              command: SERVE_COMMAND,
              url: `${BASE_URL}/commerce/`,
              reuseExistingServer: !process.env.CI,
              timeout: 180_000,
              stdout: 'pipe',
              stderr: 'pipe',
          },
});
