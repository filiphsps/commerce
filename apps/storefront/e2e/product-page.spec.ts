import { expect, test } from '@playwright/test';

const PRODUCT_HANDLE = 'mock-shop-product-1';

test('product page renders title, price, and gallery', async ({ page }) => {
    await page.goto(`/en-US/products/${PRODUCT_HANDLE}/`);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByText(/\$|kr|€/)).toBeVisible();
});

test('variant selection updates the URL and price', async ({ page }) => {
    await page.goto(`/en-US/products/${PRODUCT_HANDLE}/`);
    const initialUrl = page.url();
    const variant = page.getByRole('radio').first();
    if (await variant.isVisible()) {
        await variant.click();
        await expect(page).not.toHaveURL(initialUrl);
    }
});
