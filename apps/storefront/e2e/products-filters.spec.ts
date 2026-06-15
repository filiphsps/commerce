import { expect, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The all-products page and its faceted filter. mock.shop's root products connection returns nothing
 * (see fixtures/storefront), so this asserts the route resolves without crashing and renders the
 * ProductFilters toolbar — the regression guard is that /products no longer 404s on an empty result
 * and always mounts the filter UI. A `sorting` param round-trips through the URL.
 */
test.describe('Products page filters', () => {
    test('renders the filter toolbar without crashing', async ({ page }) => {
        const response = await page.goto(`/${LOCALE}/products/`, { waitUntil: 'domcontentloaded' });
        expect(response?.status() ?? 200).toBeLessThan(500);

        await expect(page.locator('select[aria-label="Sort"]')).toBeVisible({ timeout: 30_000 });
    });

    test('keeps a sorting selection in the URL', async ({ page }) => {
        const response = await page.goto(`/${LOCALE}/products/?sorting=PRICE`, { waitUntil: 'domcontentloaded' });
        expect(response?.status() ?? 200).toBeLessThan(500);
        await expect(page).toHaveURL(/sorting=PRICE/);
        await expect(page.locator('select[aria-label="Sort"]')).toHaveValue('PRICE', { timeout: 30_000 });
    });
});
