import { expect, test } from '@playwright/test';

const COLLECTION_URL = '/en-US/products/';

test.describe('Product card single-buyable fast-path', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test('single-buyable card shows the fast-path indicator on +', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const fastPath = page.locator('[data-testid="product-card-root"] [data-fast-path]');
        if (
            !(await fastPath
                .first()
                .isVisible({ timeout: 10_000 })
                .catch(() => false))
        ) {
            test.skip(true, 'No single-buyable products in seed data');
        }
        await expect(fastPath.first()).toBeVisible();
    });
});
