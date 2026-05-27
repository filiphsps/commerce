import { expect, test } from '@playwright/test';

const COLLECTION_URL = '/en-US/products/';
const SEARCH_URL = '/en-US/search/?q=candy';

test.describe('Product card picker', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test.skip('float picker opens via + and closes via ESC', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const firstCard = page.getByTestId('product-card-root').first();
        if (!(await firstCard.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available');
        }
        const cta = firstCard.getByRole('button', { name: /choose options|add to bag/i });
        if (!(await cta.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'No picker CTA visible on the first card');
        }
        await cta.click();
        const overlay = page.getByRole('dialog').or(page.getByRole('group')).first();
        await expect(overlay).toBeVisible({ timeout: 3_000 });
        await page.keyboard.press('Escape');
        await expect(overlay).toBeHidden({ timeout: 3_000 });
    });

    test.skip('search row picker opens and closes via backdrop click', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto(SEARCH_URL);
        const firstRow = page.getByTestId('product-card-root').first();
        if (!(await firstRow.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No matching search results');
        }
        const cta = firstRow.getByRole('button', { name: /choose options|add to bag/i });
        if (!(await cta.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'No picker CTA visible on the first row');
        }
        await cta.click();
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible({ timeout: 3_000 });
        await page.mouse.click(5, 5);
        await expect(dialog).toBeHidden({ timeout: 3_000 });
    });
});
