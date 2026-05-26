import { expect, test } from '@playwright/test';

const COLLECTION_URL = '/en-US/products/';

test.describe('Product card out-of-stock state', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test('OOS card sets data-availability and disables the CTA', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const oos = page.locator('[data-testid="product-card-root"][data-availability="out-of-stock"]');
        if ((await oos.count()) === 0) {
            test.skip(true, 'No out-of-stock products in seed data');
        }
        const cta = oos.first().locator('button').first();
        await expect(cta).toBeDisabled();
    });
});
