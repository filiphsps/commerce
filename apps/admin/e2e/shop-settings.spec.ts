import { expect, test } from '@playwright/test';

// Note: Tests smoke-test the auth gate on the shop-settings route and verify
// the page is reachable. Full round-trip (edit name → save → reload → persist)
// is deferred until an authenticated-session fixture is added — consistent with
// the pattern used in dashboard.spec.ts and auth-gate.spec.ts.
//
// Set E2E_SHOP_DOMAIN to override the default test shop domain.

const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'shop.test';

test.describe('Shop settings page', () => {
    test('unauthenticated request to shop settings redirects to login', async ({ page, context }) => {
        await context.clearCookies();
        await page.goto(`/${DOMAIN}/settings/shop/`);
        await expect(page).toHaveURL(/login|auth/i);
    });

    // Skipped until an authenticated-session Playwright fixture is available.
    // When auth fixtures are added, remove .skip and assert the full round-trip.
    test.skip('admin can change Shop name and see it persist', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/shop/`);

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        const original = await nameInput.inputValue();
        const updated = `${original} (edited)`;

        await nameInput.fill(updated);
        await page.getByRole('button', { name: /^save$/i }).click();

        await page.waitForLoadState('networkidle');
        await page.reload();

        await expect(page.locator('input[name="name"]')).toHaveValue(updated);

        // Restore so the test is idempotent.
        await page.locator('input[name="name"]').fill(original);
        await page.getByRole('button', { name: /^save$/i }).click();
    });
});
