import { expect, test } from '@playwright/test';

import { armClerkTestingToken, E2E_SHOP_DOMAIN } from './support/clerk';

/**
 * Verifies the URL-is-canonical active-org reconciliation (spec decision #12 / Task 5.1): entering the
 * seeded shop's `/[domain]/` route lands the operator in that shop's workspace with the active org kept
 * consistent — no redirect back to sign-in, no wrong-tenant flash, no crash — and the
 * `<OrganizationSwitcher>` (the active-org surface the sync drives) is present in the shell.
 *
 * Uses the REAL seeded handle (`E2E_SHOP_DOMAIN`) owned by the operator's seeded org. Read-only —
 * rerun-safe.
 */
test.describe('active-org / routed-shop reconciliation', () => {
    test('navigating to /[domain]/ stays on the shop workspace with a consistent active org', async ({ page }) => {
        await armClerkTestingToken(page);

        await page.goto(`/${E2E_SHOP_DOMAIN}/`);

        // No bounce to sign-in: the routed shop is authorized through the synced org mirror.
        await expect(page).not.toHaveURL(/\/auth\/sign-in/);
        await expect(page).toHaveURL(new RegExp(`/${E2E_SHOP_DOMAIN.replace(/\./g, '\\.')}/`));

        // The shop workspace rendered (its "Home" page header), not a wrong-tenant / error surface.
        await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible({ timeout: 30_000 });

        // The OrganizationSwitcher — the active-org UI the ActiveOrgSync keeps aligned — is mounted.
        await expect(
            page.locator('.cl-organizationSwitcher-root, .cl-organizationSwitcherTrigger').first(),
        ).toBeVisible({
            timeout: 30_000,
        });
    });

    test('arriving via the chooser card keeps the same tenant (no wrong-tenant flash)', async ({ page }) => {
        await armClerkTestingToken(page);
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Choose a storefront' })).toBeVisible({ timeout: 30_000 });

        await page
            .getByRole('link', { name: new RegExp(E2E_SHOP_DOMAIN.replace(/\./g, '\\.')) })
            .first()
            .click();

        await expect(page).toHaveURL(new RegExp(`/${E2E_SHOP_DOMAIN.replace(/\./g, '\\.')}/`), { timeout: 30_000 });
        // The destination consistently shows the routed shop, never a different tenant's chrome.
        await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible({ timeout: 30_000 });
        await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    });
});
