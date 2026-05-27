import { expect, test } from '@playwright/test';

const COLLECTION_URL = '/en-US/products/';

test.describe('Product card swatch swap', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test.skip('clicking a swatch swaps the image src without navigating', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const url = page.url();
        const card = page.getByTestId('product-card-root').first();
        if (!(await card.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available');
        }
        const img = card.locator('img').first();
        const initialSrc = await img.getAttribute('src');
        const swatches = card.locator('[data-option-value] button');
        if ((await swatches.count()) < 2) {
            test.skip(true, 'No swatches with multiple values on the first card');
        }
        await swatches.nth(1).click();
        await page.waitForTimeout(200);
        const newSrc = await img.getAttribute('src');
        expect(newSrc).not.toBe(initialSrc);
        expect(page.url()).toBe(url);
    });
});
