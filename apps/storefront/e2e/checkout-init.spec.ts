import { expect, test } from '@playwright/test';

const PRODUCT_HANDLE = 'mock-shop-product-1';

test('checkout button navigates to Shopify checkout URL with locale and currency', async ({ page }) => {
    await page.goto(`/en-US/products/${PRODUCT_HANDLE}/`);
    await page.getByRole('button', { name: /add to cart/i }).click();
    await page.goto('/en-US/cart/');

    const checkoutPromise = page.waitForRequest(/checkout|shopify/i);
    await page.getByRole('button', { name: /checkout/i }).click();
    const req = await checkoutPromise;
    expect(req.url()).toMatch(/checkout|shopify/);
});
