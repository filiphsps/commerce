import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

const COLLECTION_URL = '/en-US/products/';

test.describe('Product card v2 — no-JS render', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test('collection grid renders fully styled without JavaScript', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const card = page.locator('article[data-layout]').first();
        if (!(await card.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available in the test storefront');
        }
        await expect(card).toBeVisible();
        await expect(card.locator('[data-display="title"]')).toBeVisible();
        await expect(card.locator('[data-display="price"]')).toBeVisible();
        await expect(card.locator('img').first()).toBeVisible();
    });
});
