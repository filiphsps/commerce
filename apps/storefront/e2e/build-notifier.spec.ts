import { expect, type Page, type Route, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The storage key the engine uses for per-session dismissal — must match the default in
 * `use-build-notifier-engine.ts` so the spec can seed and inspect sessionStorage directly.
 */
const STORAGE_KEY = 'next-build-notifier:dismissed';

/** Window augmentation for the reload-detection marker the spec sets before clicking Reload. */
type ReloadMarkerWindow = Window & { __nbnReloaded?: boolean };

/**
 * Stubs the `/api/version` route (tenant-scoped, any domain prefix) to return the given build id.
 * Uses a glob that covers both the full tenant path (`/nordcom-demo-shop.com/api/version`) and the
 * relative path the client fetch resolves to (`/api/version`) so the intercept fires regardless of
 * which URL the fetcher hits.
 *
 * @param page - The Playwright page.
 * @param id - The build id to return from the stub.
 * @returns Resolves once the route handler is registered.
 */
async function stubVersion(page: Page, id: string): Promise<void> {
    await page.route('**/api/version**', (route: Route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id, ts: Date.now() }),
        }),
    );
}

/**
 * Dispatches a `window.focus` event inside the page to trigger the engine's refetchOnFocus path,
 * simulating the user returning to the tab. The engine registers this listener on mount and calls
 * `check()` immediately when it fires.
 *
 * @param page - The Playwright page.
 * @returns Resolves once the event has been dispatched.
 */
async function triggerFocusRecheck(page: Page): Promise<void> {
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

/**
 * Playwright e2e coverage for the storefront build-notifier banner.
 *
 * The ONLY thing stubbed is the `/api/version` endpoint response — we cannot redeploy mid-test to
 * produce a genuine new build, so the "new build" signal is simulated by returning a build id that
 * differs from the client's baked `NEXT_PUBLIC_BUILD_ID` (`e2e-baked-id`, set in the webServer env).
 * Everything else — the real provider, banner rendering, dismiss/reload interactions, and
 * sessionStorage persistence — is exercised for real.
 *
 * The banner is naturally isolated per browser context (sessionStorage is per-session), so no
 * persistent server state is mutated and specs are rerun-safe.
 */
test.describe('Build-notifier banner', () => {
    test('appears when the server reports a newer build', async ({ page }) => {
        await stubVersion(page, 'e2e-build-1');
        await page.goto(`/${LOCALE}/`, { waitUntil: 'domcontentloaded' });

        // The banner mounts and checks on initial load; wait for it to surface.
        const banner = page.getByTestId('build-notifier-banner');
        await expect(banner).toBeVisible({ timeout: 30_000 });

        // Assert the localized title text is present inside the banner.
        await expect(banner).toContainText('A new version is available');

        // Both action buttons must be present.
        await expect(page.getByRole('button', { name: /reload/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /dismiss/i })).toBeVisible();
    });

    test('dismiss hides the banner and survives a re-check for the same build', async ({ page }) => {
        await stubVersion(page, 'e2e-build-1');
        await page.goto(`/${LOCALE}/`, { waitUntil: 'domcontentloaded' });

        const banner = page.getByTestId('build-notifier-banner');
        await expect(banner).toBeVisible({ timeout: 30_000 });

        // Click Dismiss — the engine writes 'e2e-build-1' to sessionStorage and hides the banner.
        await page.getByRole('button', { name: /dismiss/i }).click();
        await expect(banner).toBeHidden();

        // Confirm the dismissal is persisted in sessionStorage.
        const stored = await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY);
        expect(stored).toBe('e2e-build-1');

        // Trigger a re-check via focus; the same build id is still dismissed so the banner stays hidden.
        await triggerFocusRecheck(page);
        await expect(banner).toBeHidden();
    });

    test('a newer build re-surfaces the banner after a previous dismiss', async ({ page }) => {
        // First, dismiss build-1.
        await stubVersion(page, 'e2e-build-1');
        await page.goto(`/${LOCALE}/`, { waitUntil: 'domcontentloaded' });

        const banner = page.getByTestId('build-notifier-banner');
        await expect(banner).toBeVisible({ timeout: 30_000 });
        await page.getByRole('button', { name: /dismiss/i }).click();
        await expect(banner).toBeHidden();

        // Now switch the stub to a newer build id and trigger a re-check.
        await stubVersion(page, 'e2e-build-2');
        await triggerFocusRecheck(page);

        // The new id differs from both the baked id and the dismissed id, so the banner re-appears.
        await expect(banner).toBeVisible({ timeout: 15_000 });
        await expect(banner).toContainText('A new version is available');
    });

    test('reload button triggers a page navigation', async ({ page }) => {
        await stubVersion(page, 'e2e-build-1');
        await page.goto(`/${LOCALE}/`, { waitUntil: 'domcontentloaded' });

        const banner = page.getByTestId('build-notifier-banner');
        await expect(banner).toBeVisible({ timeout: 30_000 });

        // Stamp a marker on the live window; a real `location.reload()` tears down the document and
        // wipes the global, so the marker reverting to `undefined` is deterministic proof of reload.
        await page.evaluate(() => {
            (window as ReloadMarkerWindow).__nbnReloaded = true;
        });
        await page.getByRole('button', { name: /reload/i }).click();
        await page.waitForFunction(() => (window as ReloadMarkerWindow).__nbnReloaded === undefined);
    });
});
