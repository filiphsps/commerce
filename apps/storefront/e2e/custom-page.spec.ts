import { expect, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The CMS-driven custom-page catch-all against the seeded tenant: the home page renders its content,
 * and an unknown slug resolves to the not-found surface instead of crashing.
 */
test.describe('Custom pages', () => {
    test('the home page renders content', async ({ page }) => {
        await page.goto(`/${LOCALE}/`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('an unknown slug resolves to the not-found surface', async ({ page }) => {
        await page.goto(`/${LOCALE}/this-page-does-not-exist-xyz/`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/not found|doesn't exist|does not exist|404/i).first()).toBeVisible({
            timeout: 15_000,
        });
    });
});
