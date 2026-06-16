import { expect, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The all-products page and its faceted filter. The Storefront API never returns facet `filters` for
 * the root `products` connection (only `Collection.products` and `search` do), so the listing
 * synthesizes them from its catalog walk — without that the filter control stays disabled. The sort
 * control maps its options to `ProductSortKeys`; a wrong key (the historical `CREATED` vs `CREATED_AT`)
 * reaches Shopify as an invalid enum literal and crashes the page. These specs guard both: the filter
 * control mounts enabled with facet groups, and every sort path (including a stale param) resolves
 * without a 5xx.
 */
test.describe('Products page filters', () => {
    test('renders the filter toolbar without crashing', async ({ page }) => {
        const response = await page.goto(`/${LOCALE}/products/`, { waitUntil: 'domcontentloaded' });
        expect(response?.status() ?? 200).toBeLessThan(500);

        await expect(page.locator('select[aria-label="Sort"]')).toBeVisible({ timeout: 30_000 });
    });

    test('enables the filter control and opens its facet groups', async ({ page }) => {
        await page.goto(`/${LOCALE}/products/`, { waitUntil: 'domcontentloaded' });

        const filters = page.getByRole('button', { name: /filters/i });
        await expect(filters).toBeEnabled({ timeout: 30_000 });

        await filters.click();
        const groups = page.getByTestId('product-filters');
        await expect(groups).toBeVisible();
        // The synthesized facets render as collapsible <summary> rows; the root products connection
        // gives none, so a populated count proves the synthesis path.
        expect(await groups.locator('summary').count()).toBeGreaterThan(0);
    });

    test('applies a Newest (CREATED_AT) sort without crashing', async ({ page }) => {
        await page.goto(`/${LOCALE}/products/`, { waitUntil: 'domcontentloaded' });

        const sort = page.locator('select[aria-label="Sort"]');
        await expect(sort).toBeVisible({ timeout: 30_000 });

        await sort.selectOption('CREATED_AT');
        await expect(page).toHaveURL(/sorting=CREATED_AT/);
        // The grid re-renders under the new sort key; a product card proves the server fetch resolved
        // rather than throwing a ProviderFetchError on an invalid enum.
        await expect(page.getByTestId('product-card-root').first()).toBeVisible({ timeout: 30_000 });
    });

    test('survives a stale or invalid sorting param', async ({ page }) => {
        for (const sorting of ['CREATED', 'definitely-not-a-sort-key']) {
            const response = await page.goto(`/${LOCALE}/products/?sorting=${sorting}`, {
                waitUntil: 'domcontentloaded',
            });
            expect(response?.status() ?? 200).toBeLessThan(500);
            await expect(page.locator('select[aria-label="Sort"]')).toBeVisible({ timeout: 30_000 });
        }
    });

    test('keeps a sorting selection in the URL', async ({ page }) => {
        const response = await page.goto(`/${LOCALE}/products/?sorting=PRICE`, { waitUntil: 'domcontentloaded' });
        expect(response?.status() ?? 200).toBeLessThan(500);
        await expect(page).toHaveURL(/sorting=PRICE/);
        await expect(page.locator('select[aria-label="Sort"]')).toHaveValue('PRICE', { timeout: 30_000 });
    });
});
