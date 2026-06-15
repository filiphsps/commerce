import { expect, test } from '@playwright/test';

test.describe('Account settings', () => {
    test('renders the account sections for the signed-in operator', async ({ page }) => {
        await page.goto('/accounts/');
        await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
        // Account-info shows the seeded operator email.
        await expect(page.getByText('e2e-test@example.com')).toBeVisible();
        // Connected accounts + preferences are present.
        await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
    });

    test('saves a display-name change', async ({ page }) => {
        await page.goto('/accounts/');
        const field = page.getByLabel('Display name');
        await field.fill('E2E Renamed Operator');
        await page.getByRole('button', { name: 'Save' }).click();
        // The success toast confirms the round-trip through the Convex seam.
        await expect(page.getByText('Profile updated.')).toBeVisible();
        // Restore the seed name so the spec is idempotent across runs.
        await field.fill('E2E Test User');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Profile updated.')).toBeVisible();
    });

    test('switches the theme preference to Dark', async ({ page }) => {
        await page.goto('/accounts/');
        await page.getByRole('radio', { name: 'Dark' }).click();
        await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        // Restore default for idempotency.
        await page.getByRole('radio', { name: 'System' }).click();
    });
});
