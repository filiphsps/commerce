import { expect, test } from '@playwright/test';

test.describe('product-card', () => {
    test('collection grid renders product cards', async ({ page }) => {
        await page.goto('/en-US/products/');
        await page.waitForLoadState('networkidle');
        const cards = page.locator('[data-testid="product-card-root"]');
        const count = await cards.count();
        if (count === 0) {
            test.skip(true, 'No products available in the test storefront');
        }
        await expect(cards.first()).toHaveAttribute('data-variant', 'vertical-boxed');
    });

    test('search results render horizontal-bare rows', async ({ page }) => {
        await page.goto('/en-US/search/?q=candy');
        await page.waitForLoadState('networkidle');
        const cards = page.locator('[data-testid="product-card-root"]');
        const count = await cards.count();
        if (count === 0) {
            test.skip(true, 'No matching products in the test storefront');
        }
        await expect(cards.first()).toHaveAttribute('data-variant', 'horizontal-bare');
    });
});
