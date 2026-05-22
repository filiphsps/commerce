import { expect, test } from '@playwright/test';

test.describe('product-card overlay', () => {
    test('clicking +N opens the overlay; Escape closes', async ({ page }) => {
        await page.goto('/en-US/products/');
        await page.waitForLoadState('networkidle');
        const moreButton = page.locator('button[aria-label^="Show all"]').first();
        if ((await moreButton.count()) === 0) {
            test.skip(true, 'No products with overflow options on this fixture');
        }
        await moreButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('clicking close button dismisses the overlay', async ({ page }) => {
        await page.goto('/en-US/products/');
        await page.waitForLoadState('networkidle');
        const moreButton = page.locator('button[aria-label^="Show all"]').first();
        if ((await moreButton.count()) === 0) {
            test.skip(true, 'No products with overflow options on this fixture');
        }
        await moreButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: /close/i }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
    });
});
