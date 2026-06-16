import { expect, type Page, type Route, test } from '@playwright/test';

import { DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/** Unique run-token stamp so the copy override never collides across parallel or repeated runs. */
const RUN_TOKEN = `e2e-bn-copy-${Date.now()}`;

/** Dotted paths for the buildNotifier overridable fields under `extensions.buildNotifier.*`. */
const POSITION_PATH = 'extensions.buildNotifier.position';
const COPY_PATH = 'extensions.buildNotifier.copy';

/**
 * Stubs the admin `/api/version` route to return a build id that differs from the client's baked
 * `NEXT_PUBLIC_BUILD_ID` (`e2e-baked-id`, set in the webServer env). The glob covers both the raw
 * `/api/version` path and any future tenant-prefixed variants.
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
 * Playwright e2e coverage for the admin build-notifier:
 *
 *   A. The `AdminBuildNotifier` banner rendered app-wide in the admin shell when the client's baked
 *      `NEXT_PUBLIC_BUILD_ID` differs from the server's `/api/version` response.
 *
 *   B. The per-shop `buildNotifier` config editor in the admin Customization hub → Components tab,
 *      which writes to `extensions.buildNotifier.*` via overridable field shells and persists through
 *      Convex across a reload.
 *
 * Only `/api/version` is stubbed in A; every other concern (provider, banner DOM, dismiss/reload,
 * editor, Convex persistence) is exercised for real. Test B resets all mutated overrides in an
 * afterEach so the shared canonical tenant is left as found.
 */
test.describe('Build-notifier', () => {
    // ──────────────────────────────────────────────────────────────────────────
    // A. Admin update banner
    // ──────────────────────────────────────────────────────────────────────────
    test.describe('admin update banner', () => {
        test('appears when the server reports a newer build', async ({ page }) => {
            await stubVersion(page, 'e2e-admin-new');
            // Navigate to the authenticated dashboard root; the shell mounts
            // AdminBuildNotifier as a global provider.
            await page.goto(`/${DOMAIN}/`);

            // The banner surfaces as role=status; wait for the polling check to fire.
            const banner = page.getByRole('status');
            await expect(banner).toBeVisible({ timeout: 30_000 });
            await expect(banner).toContainText('New build deployed');

            // Both action buttons must be present.
            await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
            await expect(page.getByLabel('Dismiss update notification')).toBeVisible();
        });

        test('dismiss hides the banner and survives a re-check for the same build', async ({ page }) => {
            await stubVersion(page, 'e2e-admin-new');
            await page.goto(`/${DOMAIN}/`);

            const banner = page.getByRole('status');
            await expect(banner).toBeVisible({ timeout: 30_000 });

            // Dismiss via the icon button (aria-label from build-notifier.tsx).
            await page.getByLabel('Dismiss update notification').click();
            await expect(banner).toBeHidden();

            // Re-dispatch focus to trigger the engine's refetchOnFocus path; the
            // dismissed id is still active so the banner must remain hidden.
            await page.evaluate(() => window.dispatchEvent(new Event('focus')));
            await expect(banner).toBeHidden();
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // B. Per-shop buildNotifier config editor
    // ──────────────────────────────────────────────────────────────────────────
    test.describe('Customization → Components → buildNotifier config editor', () => {
        /**
         * Reset the position and copy overrides back to inherit after each test so the shared
         * canonical tenant's `extensions.buildNotifier` state is left as found.
         */
        test.afterEach(async ({ page }) => {
            await page.goto(`/${DOMAIN}/settings/customization/`);
            await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/customization/\\?locale=`));
            await page.getByRole('tab', { name: 'Components' }).click();

            // Reset position → inherit (only if currently overriding). Await the toggle's visibility
            // first: a bare getAttribute on an unpainted tab returns null, silently skipping the
            // reset and leaving the shared tenant's override in place.
            const positionOverrideBtn = page.getByTestId(`override-override-${POSITION_PATH}`);
            await expect(positionOverrideBtn).toBeVisible();
            if ((await positionOverrideBtn.getAttribute('aria-pressed')) === 'true') {
                await page.getByTestId(`override-inherit-${POSITION_PATH}`).click();
                await expect(page.getByTestId(`override-inherited-${POSITION_PATH}`)).toBeVisible();
            }

            // Reset copy → inherit (only if currently overriding).
            const copyOverrideBtn = page.getByTestId(`override-override-${COPY_PATH}`);
            await expect(copyOverrideBtn).toBeVisible();
            if ((await copyOverrideBtn.getAttribute('aria-pressed')) === 'true') {
                await page.getByTestId(`override-inherit-${COPY_PATH}`).click();
                await expect(page.getByTestId(`override-inherited-${COPY_PATH}`)).toBeVisible();
            }

            await page.getByRole('button', { name: 'Save Draft' }).click();
            await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
            await waitForAutosave(page);
        });

        test('all buildNotifier field shells are present on the Components tab', async ({ page }) => {
            await page.goto(`/${DOMAIN}/settings/customization/`);
            await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/customization/\\?locale=`));
            await page.getByRole('tab', { name: 'Components' }).click();

            // The five overridable field shells produced by COMPONENT_SETTINGS for buildNotifier.
            await expect(page.getByTestId('field-extensions.buildNotifier.enabled')).toBeVisible();
            await expect(page.getByTestId('field-extensions.buildNotifier.position')).toBeVisible();
            await expect(page.getByTestId('field-extensions.buildNotifier.copy')).toBeVisible();
            await expect(page.getByTestId('field-extensions.buildNotifier.autoReload')).toBeVisible();
            await expect(page.getByTestId('field-extensions.buildNotifier.dismissable')).toBeVisible();
        });

        test('overriding position and copy persists across reload, then resets to inherit', async ({ page }) => {
            await page.goto(`/${DOMAIN}/settings/customization/`);
            await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/customization/\\?locale=`));
            await page.getByRole('tab', { name: 'Components' }).click();

            // Toggle position override ON, then select 'top'.
            await page.getByTestId(`override-override-${POSITION_PATH}`).click();
            await fieldControl(page, POSITION_PATH, 'select').selectOption('top');

            // Toggle copy override ON, then fill the unique run-token.
            await page.getByTestId(`override-override-${COPY_PATH}`).click();
            await fieldControl(page, COPY_PATH, 'input').fill(RUN_TOKEN);

            // Persist without error.
            await page.getByRole('button', { name: 'Save Draft' }).click();
            await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
            await waitForAutosave(page);

            // Reload → both overrides are durable.
            await page.reload();
            await page.getByRole('tab', { name: 'Components' }).click();

            await expect(page.getByTestId(`override-override-${POSITION_PATH}`)).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            await expect(fieldControl(page, POSITION_PATH, 'select')).toHaveValue('top');

            await expect(page.getByTestId(`override-override-${COPY_PATH}`)).toHaveAttribute('aria-pressed', 'true');
            await expect(fieldControl(page, COPY_PATH, 'input')).toHaveValue(RUN_TOKEN);

            // The afterEach resets both overrides back to inherit so the shared tenant is left clean.
        });
    });
});
