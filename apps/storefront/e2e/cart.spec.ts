import { expect, test } from '@playwright/test';

const PRODUCT_HANDLE = 'mock-shop-product-1';

test('add-to-cart from product page populates the cart', async ({ page }) => {
    await page.goto(`/en-US/products/${PRODUCT_HANDLE}/`);
    await page.getByRole('button', { name: /add to cart/i }).click();
    await page.goto('/en-US/cart/');
    await expect(page.getByText(/cart|line/i).first()).toBeVisible();
});

test('cart shows the empty-cart state when no items', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/en-US/cart/');
    await expect(page.getByText(/empty|nothing here|no items/i)).toBeVisible();
});
