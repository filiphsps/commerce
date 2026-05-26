import { expect, test } from '@playwright/test';

const COLLECTION_URL = '/en-US/products/';

test.describe('Product card sale state', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test('on-sale card renders the data attribute and a compare-price', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const onSale = page.locator('[data-testid="product-card-root"][data-on-sale]');
        if ((await onSale.count()) === 0) {
            test.skip(true, 'No on-sale products in seed data');
        }
        const priceBlock = onSale.first().locator('[data-on-sale]');
        await expect(priceBlock.first()).toBeVisible();
        // Compare price renders as a second tabular-nums span; assert two price-like nodes within the block.
        const prices = priceBlock.first().locator('span');
        const count = await prices.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });
});
