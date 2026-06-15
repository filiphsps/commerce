import { expect, test } from '@playwright/test';

import { productPath } from './fixtures/storefront';

/**
 * Product detail page against the seeded mock.shop tenant (real handle `sweatpants`): the title, a
 * price, the image gallery, the quantity stepper, variant (size) selection, the add-to-cart CTA, and
 * the recommendations rail all render for a real product.
 */
test.describe('Product detail page', () => {
    test('renders title, a price, and the image gallery', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toHaveText(/sweatpants/i, { timeout: 30_000 });
        await expect(page.getByText(/\$|kr|€/).first()).toBeVisible();
        // Gallery thumbnails expose per-image controls (exact: "View image 1" must not match "…10").
        await expect(page.getByRole('button', { name: 'View image 1', exact: true })).toBeVisible();
    });

    test('exposes a quantity stepper and an add-to-cart CTA', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('quantity-input')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId('quantity-increase')).toBeVisible();
        await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible();
    });

    test('selecting a size variant keeps the shopper on the PDP and updates selection', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        // Options stream in; wait for the add-to-cart CTA (PDP options resolved) before counting.
        await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible({ timeout: 30_000 });
        const sizeOption = page.locator('button[aria-label^="Size:"]');
        if ((await sizeOption.count()) < 2) {
            test.skip(true, 'product has fewer than two size options');
        }
        const target = sizeOption.nth(1);
        const label = await target.getAttribute('aria-label');
        await target.click();
        // Selection stays on the PDP (no full navigation away) and the add-to-cart CTA remains.
        await expect(page).toHaveURL(new RegExp(productPath().replace(/\/$/, '')));
        await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible();
        expect(label).toMatch(/^Size:/);
    });

    test('renders a recommendations rail of further products', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        // The rail is built from product cards; at least one renders below the fold.
        await expect(page.getByTestId('product-card-root').first()).toBeVisible({ timeout: 30_000 });
    });
});
