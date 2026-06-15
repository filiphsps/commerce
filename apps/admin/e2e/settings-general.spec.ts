import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * The settings "General" entry through the REAL admin app. The settings overview card, the settings
 * subnav, and a direct hit on `/{domain}/settings/general/` all advertise a General section to every
 * role; this asserts the route is actually reachable — it must land on the shop editor (where general
 * shop config lives) rather than 404 or bounce to login.
 */
test.describe('Settings · General', () => {
    test('a direct hit on the general route lands on the shop editor', async ({ page }) => {
        const response = await page.goto(`/${DOMAIN}/settings/general/`);
        expect(response?.status()).toBeLessThan(400);

        // General is an alias: the routing-layer redirect lands on the shop route, which then
        // normalizes onto the tenant default locale.
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/shop/\\?locale=`), { timeout: 30_000 });
        await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible({ timeout: 30_000 });
    });

    test('the settings overview General card navigates to the shop editor', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/`);
        await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

        // Scope to the General card (its h2) so the click targets that card's "Manage →" and not a
        // sibling card's — every card carries the same link text.
        await page
            .getByRole('heading', { level: 2, name: 'General' })
            .locator('..')
            .getByRole('link', { name: /^Manage/ })
            .click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/shop/`), { timeout: 30_000 });
        await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible({ timeout: 30_000 });
    });

    test('the settings subnav General link navigates to the shop editor', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/`);
        // Scope to the subnav: the collapsed rail mirrors the same nav links, so an unscoped
        // role lookup is ambiguous.
        await page.getByTestId('subnav').getByRole('link', { name: 'General', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/shop/`), { timeout: 30_000 });
        await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible({ timeout: 30_000 });
    });
});
