import { expect, test } from '@playwright/test';

import { armClerkTestingToken } from './support/clerk';

/**
 * Verifies the Clerk sign-in surface renders themed to the admin identity (dark canvas, magenta
 * primary, AuthShell chrome) for an unauthenticated visitor, and — using the operator storage state
 * the harness signed in — that the authenticated root reaches the chooser/dashboard.
 *
 * Each test arms Clerk's testing token first so the page bypasses bot detection. The first test opts
 * OUT of the shared storage state to exercise the real unauthenticated sign-in screen; the second
 * inherits it to assert the authenticated landing.
 */
test.describe('Clerk sign-in', () => {
    test.describe('unauthenticated', () => {
        test.use({ storageState: { cookies: [], origins: [] } });

        test('renders the themed sign-in screen on the dark, magenta admin chrome', async ({ page }) => {
            await armClerkTestingToken(page);
            await page.goto('/auth/sign-in/');

            // AuthShell chrome: the "Welcome back" eyebrow + "Sign in" heading wrap Clerk's <SignIn/>.
            await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
            await expect(page.getByText('Welcome', { exact: false })).toBeVisible();

            // Dark canvas: the body paints the flat-black background token (#000) the appearance pins.
            const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
            expect(background).toBe('rgb(0, 0, 0)');

            // Clerk's email field mounts inside the shell (the prebuilt form rendered, themed).
            await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 30_000 });
        });

        test('unauthenticated root redirects to the Clerk sign-in route', async ({ page }) => {
            await armClerkTestingToken(page);
            await page.goto('/');
            await expect(page).toHaveURL(/\/auth\/sign-in/);
        });
    });

    test('the seeded operator lands authenticated on the storefront chooser', async ({ page }) => {
        await armClerkTestingToken(page);
        await page.goto('/');

        await expect(page).not.toHaveURL(/\/auth\/sign-in/);
        await expect(page.getByRole('heading', { name: 'Choose a storefront' })).toBeVisible({ timeout: 30_000 });
    });
});
