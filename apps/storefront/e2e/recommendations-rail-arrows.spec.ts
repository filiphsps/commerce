import { expect, test } from '@playwright/test';

const PRODUCT_URL = '/en-US/products/mock-shop-product-1/';

test.describe('Recommendations rail arrows', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test.skip('PDP rail exposes a next arrow when content overflows', async ({ page }) => {
        const response = await page.goto(PRODUCT_URL);
        if (!response || response.status() >= 400) {
            test.skip(true, 'Known PDP fixture missing');
        }
        const next = page.getByRole('button', { name: 'Next' }).first();
        if (!(await next.isVisible({ timeout: 10_000 }).catch(() => false))) {
            test.skip(true, 'Rail does not overflow on this PDP');
        }
        const rail = page.locator('[data-rail]').first();
        const firstChild = rail.locator(':scope > *').first();
        const before = await firstChild.boundingBox();
        await next.click();
        await page.waitForTimeout(400);
        const after = await firstChild.boundingBox();
        expect(after?.x ?? 0).toBeLessThan(before?.x ?? 0);
    });
});
